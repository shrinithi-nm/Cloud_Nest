import { request } from 'node:http'
import test from 'node:test'
import assert from 'node:assert/strict'
import { quantity, podUsage } from '../src/quantities.js'
import { collectSnapshot, snapshotCache } from '../src/snapshot.js'
import { monitoringServer } from '../src/server.js'
const config = { namespace: 'default', deployment: 'web', hpa: 'web-hpa', selector: 'app=web' }
const readers = () => ({
  deployment: async () => ({ metadata: { name: 'web', generation: 3 }, spec: { replicas: 2, template: { spec: { containers: [{ env: [{ name: 'TOKEN', value: 'DO_NOT_EXPOSE' }] }] } } }, status: { readyReplicas: 1, updatedReplicas: 2 } }),
  pods: async () => ({ items: [{ metadata: { name: 'web-1', uid: 'p1' }, status: { phase: 'Running', containerStatuses: [{ restartCount: 2 }], conditions: [{ type: 'Ready', status: 'False' }] } }] }),
  metrics: async () => ({ items: [{ metadata: { name: 'web-1' }, containers: [{ usage: { cpu: '100m', memory: '1Mi' } }, { usage: { cpu: '2000000n', memory: '2Mi' } }] }] }),
  hpa: async () => ({ spec: { maxReplicas: 6, metrics: [{ type: 'Resource', resource: { name: 'cpu', target: { averageUtilization: 50 } } }] }, status: {} }),
  events: async () => ({ items: [] }),
})
test('quantities cover CPU, memory, decimal, binary and exponent units', () => {
  for (const [value, expected] of [['250m', .25], ['123n', 123e-9], ['40u', 40e-6], ['2', 2], ['1Ki', 1024], ['2Mi', 2097152], ['1Gi', 1073741824], ['2G', 2e9], ['1e3', 1000], ['1E-3', .001], ['.5', .5]]) assert.ok(Math.abs(quantity(value) - expected) <= Math.abs(expected) * 1e-12)
  for (const value of [undefined, 'invalid', '-1', '2foo']) assert.equal(quantity(value), null)
  assert.equal(podUsage({ containers: [{ usage: { cpu: '2m' } }, { usage: { memory: '2Mi' } }] }).cpuMillicores, null)
})
test('snapshot maps actual readiness, sums containers, omits raw credentials', async () => {
  const s = await collectSnapshot(readers(), config)
  assert.equal(s.sections.deployment.data.desired, 2)
  assert.equal(s.sections.deployment.data.ready, 1)
  assert.equal(s.sections.pods.data[0].ready, false)
  assert.equal(s.sections.pods.data[0].phase, 'Running')
  assert.ok(Math.abs(s.sections.metrics.data.cpuMillicores - 102) < 1e-9)
  assert.equal(s.sections.metrics.data.memoryBytes, 3145728)
  assert.equal(s.sections.hpa.data.targetCpuPercent, 50)
  assert.equal(s.sections.hpa.data.currentCpuPercent, null)
  assert.equal(JSON.stringify(s).includes('DO_NOT_EXPOSE'), false)
})
test('partial metrics and resource failures retain useful workload readings; errors are sanitized', async () => {
  const r = readers()
  r.metrics = async () => { throw { code: 403, body: 'DO_NOT_EXPOSE', message: 'token=DO_NOT_EXPOSE' } }
  const s = await collectSnapshot(r, config)
  assert.equal(s.availability, 'partial')
  assert.equal(s.sections.metrics.data, null)
  assert.equal(s.sections.deployment.availability, 'available')
  assert.equal(JSON.stringify(s).includes('DO_NOT_EXPOSE'), false)
  r.metrics = async () => ({ items: [] })
  const missing = await collectSnapshot(r, config)
  assert.equal(missing.sections.metrics.data.cpuMillicores, null)
  r.pods = async () => { throw new Error('failed') }
  assert.equal((await collectSnapshot(r, config)).sections.metrics.data.memoryBytes, null)
})
test('all failures remain explicit and cache deduplicates concurrent callers', async () => {
  const r = Object.fromEntries(Object.keys(readers()).map(k => [k, async () => { throw new Error('offline') }]))
  assert.equal((await collectSnapshot(r, config)).availability, 'unavailable')
  let calls = 0
  const cached = snapshotCache(async () => { calls++; await new Promise(resolve => setTimeout(resolve, 10)); return { value: calls } })
  const results = await Promise.all([cached(), cached(), cached()])
  assert.equal(calls, 1)
  assert.equal(results[0], results[1])
  await cached()
  assert.equal(calls, 1)
})
test('HTTP surface rejects untrusted hosts, origins, writes and arbitrary paths', async () => {
  const server = monitoringServer(async () => ({ observedAt: 'test' }), { port: 4100 })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${server.address().port}`
  try {
    const headers = {}
    assert.equal((await fetch(`${url}/healthz`, { headers })).status, 200)
    assert.equal((await fetch(`${url}/api/cloud/snapshot`, { headers })).status, 200)
    assert.equal((await fetch(`${url}/api/cloud/snapshot`, { headers: { ...headers, origin: 'https://evil.example' } })).status, 403)
    const denied = await new Promise((resolve, reject) => {
      const req = request(`${url}/api/cloud/snapshot`, { headers: { host: 'evil.example' } }, res => { res.resume(); resolve(res.statusCode) })
      req.on('error', reject)
      req.end()
    })
    assert.equal(denied, 403)
    assert.equal((await fetch(`${url}/api/cloud/snapshot`, { headers, method: 'POST' })).status, 405)
    assert.equal((await fetch(`${url}/api/cloud/exec`, { headers })).status, 404)
  } finally { await new Promise(resolve => server.close(resolve)) }
})



test('events are relevant, recent and bounded; truncation and missing metrics are explicit', async () => {
  const r = readers()
  const event = (name, time) => ({ metadata: { uid: name + time }, involvedObject: { kind: 'Pod', name }, lastTimestamp: time, reason: 'Scheduled' })
  r.events = async () => ({ metadata: { continue: 'next-page' }, items: [event('web-1', '2026-10-20T12:00:00Z'), event('other', '2026-10-20T12:00:00Z'), event('web-1', '2026-10-19T12:00:00Z')] })
  r.pods = async () => ({ metadata: { continue: 'more' }, items: (await readers().pods()).items })
  const s = await collectSnapshot(r, config, () => new Date('2026-10-20T12:30:00Z'))
  assert.equal(s.sections.events.data.length, 1)
  assert.equal(s.sections.events.availability, 'partial')
  assert.equal(s.sections.pods.availability, 'partial')
  assert.equal(s.sections.metrics.data.cpuMillicores, null)
})
