import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import * as k8s from '@kubernetes/client-node'
import { createControlApi } from '../src/controller-kubernetes.js'
import { buildJob, controllerConfig, JOB_NAME } from '../src/experiments.js'
import { randomUUID } from 'node:crypto'

test('installed Kubernetes client sends fixed names, selectors, JSON Patch tests and UID delete preconditions', async () => {
  const config = controllerConfig({})
  const job = buildJob(config, { experimentId: randomUUID(), durationSeconds: 30, concurrency: 4 })
  Object.assign(job.metadata, { uid: 'verified-job-uid', resourceVersion: '7' })
  const requests = []
  // This HTTP server is a fake Kubernetes API on loopback. It never touches a cluster.
  const server = createServer(async (req, res) => {
    let body = ''
    for await (const chunk of req) body += chunk
    requests.push({ method: req.method, url: new URL(req.url, 'http://local'), contentType: req.headers['content-type'], body: body ? JSON.parse(body) : null })
    res.setHeader('Content-Type', 'application/json')
    if (req.url.startsWith('/api/v1/')) res.end(JSON.stringify({ apiVersion: 'v1', kind: 'PodList', items: [], metadata: {} }))
    else if (req.method === 'DELETE') res.end(JSON.stringify({ apiVersion: 'v1', kind: 'Status', status: 'Success' }))
    else res.end(JSON.stringify(job))
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const kc = new k8s.KubeConfig()
  kc.loadFromOptions({ clusters: [{ name: 'fixture', skipTLSVerify: true, server: `http://127.0.0.1:${server.address().port}` }], users: [{ name: 'fixture' }], contexts: [{ name: 'fixture', cluster: 'fixture', user: 'fixture' }], currentContext: 'fixture' })
  try {
    const api = createControlApi(config, kc)
    await api.readJob()
    await api.listPods()
    await api.createJob(job)
    await api.suspendJob(job, '2026-10-20T12:00:10Z')
    await api.deleteJob(job.metadata.uid)
    assert.deepEqual(requests.map(r => r.method), ['GET', 'GET', 'POST', 'PATCH', 'DELETE'])
    const path = `/apis/batch/v1/namespaces/default/jobs/${JOB_NAME}`
    assert.equal(requests[0].url.pathname, path)
    assert.equal(requests[1].url.searchParams.get('labelSelector'), 'cloudnest.io/feature=frontend-traffic-v1')
    assert.equal(requests[1].url.searchParams.get('limit'), '100')
    assert.equal(requests[2].url.pathname, '/apis/batch/v1/namespaces/default/jobs')
    assert.equal(requests[3].url.pathname, path)
    assert.equal(requests[3].contentType, 'application/json-patch+json')
    assert.deepEqual(requests[3].body[0], { op: 'test', path: '/metadata/uid', value: 'verified-job-uid' })
    assert.deepEqual(requests[3].body[1], { op: 'test', path: '/metadata/resourceVersion', value: '7' })
    assert.equal(requests[3].body.at(-1).value, true)
    assert.equal(requests[4].body.propagationPolicy, 'Foreground')
    assert.equal(requests[4].body.preconditions.uid, 'verified-job-uid')
  } finally { await new Promise(resolve => server.close(resolve)) }
})
