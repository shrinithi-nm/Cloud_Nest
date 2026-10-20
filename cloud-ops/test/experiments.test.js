import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { Script } from 'node:vm'
import { BOUNDS, FEATURE_LABEL, JOB_NAME, buildJob, controllerConfig, createExperimentController, validateInput } from '../src/experiments.js'
import { GENERATOR_IMAGE, GENERATOR_SOURCE } from '../src/generator.js'
import { controllerServer } from '../src/controller-server.js'

const config = controllerConfig({})
const input = () => ({ experimentId: randomUUID(), durationSeconds: 30, concurrency: 4 })
function backend() {
  const state = { job: null, pods: [], creates: 0, deletes: 0, patches: 0, failDelete: false, failSuspend: false, deferDelete: false }
  const api = {
    async readJob() { if (!state.job) throw { code: 404 }; return structuredClone(state.job) },
    async listPods() { return { items: structuredClone(state.pods) } },
    async createJob(job) {
      if (state.job) throw { code: 409 }
      state.creates++
      state.job = structuredClone(job)
      Object.assign(state.job.metadata, { uid: randomUUID(), resourceVersion: '1', creationTimestamp: '2026-10-20T12:00:00Z' })
      return structuredClone(state.job)
    },
    async suspendJob(job, timestamp) {
      state.patches++
      if (state.failSuspend) throw { code: 403 }
      assert.equal(job.metadata.uid, state.job.metadata.uid)
      assert.equal(job.metadata.resourceVersion, state.job.metadata.resourceVersion)
      state.job.spec.suspend = true
      state.job.metadata.annotations['cloudnest.io/stop-requested-at'] = timestamp
      state.job.metadata.resourceVersion = String(Number(state.job.metadata.resourceVersion) + 1)
    },
    async deleteJob(uid) {
      state.deletes++
      assert.equal(uid, state.job.metadata.uid)
      if (state.failDelete) throw { code: 403, message: 'SECRET' }
      if (state.deferDelete) { state.job.metadata.deletionTimestamp = '2026-10-20T12:00:30Z'; return }
      state.job = null
      state.pods = []
    },
  }
  return { state, api }
}
function pod(job, phase = 'Running') {
  return { metadata: { name: `${JOB_NAME}-pod`, labels: { ...job.metadata.labels }, ownerReferences: [{ kind: 'Job', name: JOB_NAME, uid: job.metadata.uid, controller: true }] }, status: { phase } }
}

test('validates integer bounds, UUID, unknown fields and fixed configuration', () => {
  const base = input()
  assert.equal(validateInput({ experimentId: base.experimentId }).durationSeconds, BOUNDS.defaultDuration)
  for (const patch of [{ durationSeconds: 0 }, { durationSeconds: 121 }, { durationSeconds: 10.5 }, { durationSeconds: '30' }, { concurrency: 0 }, { concurrency: 17 }, { concurrency: 1.5 }, { url: 'https://outside.example' }, { image: 'evil' }, { command: 'rm' }, { experimentId: '../jobs' }]) assert.throws(() => validateInput({ ...base, ...patch }), e => e.status === 400)
  for (const value of [null, [], 'test']) assert.throws(() => validateInput(value))
  assert.throws(() => validateInput({ experimentId: base.experimentId, target: '/' }, true))
  assert.throws(() => controllerConfig({ KUBE_FRONTEND_SERVICE: 'outside.example/path' }))
  assert.equal(config.target, 'http://cloudnest-frontend-service.default.svc.cluster.local:80/')
})

test('Job has immutable target, pinned image, concurrent workers, hard deadlines and no token', () => {
  const job = buildJob(config, input())
  assert.equal(job.spec.activeDeadlineSeconds, 45)
  assert.equal(job.spec.template.spec.activeDeadlineSeconds, 45)
  assert.equal(job.spec.backoffLimit, 0)
  assert.equal(job.spec.parallelism, 1)
  assert.equal(job.spec.ttlSecondsAfterFinished, 600)
  assert.equal(job.spec.template.spec.automountServiceAccountToken, false)
  assert.equal(job.spec.template.spec.restartPolicy, 'Never')
  const container = job.spec.template.spec.containers[0]
  assert.equal(container.image, GENERATOR_IMAGE)
  assert.match(container.image, /24\.12\.0/)
  assert.deepEqual(container.resources.limits, { cpu: '250m', memory: '96Mi' })
  assert.equal(container.env.find(e => e.name === 'FRONTEND_TARGET').value, config.target)
  assert.equal(container.command[0], 'node')
  assert.ok(!('app' in job.spec.template.metadata.labels))
  new Script(GENERATOR_SOURCE)
  assert.match(GENERATOR_SOURCE, /Promise\.all\(Array\.from\(\{ length: concurrency \}, worker\)\)/)
  assert.match(GENERATOR_SOURCE, /setTimeout\(finish, duration\)/)
})

test('duplicate and concurrent starts create one Job, including across controller instances', async () => {
  const { state, api } = backend()
  const a = createExperimentController(api, config), b = createExperimentController(api, config)
  const body = input()
  const results = await Promise.all([a.start(body), b.start(body), a.start(body)])
  assert.equal(state.creates, 1)
  assert.ok(results.every(result => result.data.experiment.id === body.experimentId))
  await assert.rejects(a.start(input()), e => e.status === 409)
  await assert.rejects(a.start({ ...body, concurrency: 2 }), e => e.code === 'ID_REUSED')
})

test('restart reconstructs Job/pod state without creating load', async () => {
  const { state, api } = backend()
  const body = input()
  await createExperimentController(api, config).start(body)
  state.job.status = { active: 1, startTime: '2026-10-20T12:00:00Z' }
  state.pods = [pod(state.job)]
  const recovered = await createExperimentController(api, config).status()
  assert.equal(recovered.data.experiment.id, body.experimentId)
  assert.equal(recovered.data.experiment.state, 'running')
  assert.equal(recovered.data.experiment.generatorPods.length, 1)
  assert.equal(state.creates, 1)
})

test('stop suspends then UID-deletes only owned Job; repeated stop is safe', async () => {
  const { state, api } = backend()
  const controller = createExperimentController(api, config)
  const body = input()
  await controller.start(body)
  const result = await controller.stop({ experimentId: body.experimentId })
  assert.equal(result.data.experiment.state, 'stopped')
  assert.equal(result.data.experiment.cleanup.status, 'complete')
  await controller.stop({ experimentId: body.experimentId })
  assert.equal(state.deletes, 1)
  assert.equal(state.patches, 1)
  const next = input()
  await controller.start(next)
  await assert.rejects(controller.stop({ experimentId: body.experimentId }), e => e.code === 'EXPERIMENT_CHANGED')
  assert.equal(state.deletes, 1)
})

test('unowned resources and mismatching pod owner references cannot be mutated', async () => {
  for (const corrupt of [job => { job.metadata.labels[FEATURE_LABEL] = 'other' }, job => { job.metadata.namespace = 'other' }, job => { job.metadata.annotations['cloudnest.io/target'] = 'https://outside.example' }]) {
    const { state, api } = backend()
    const controller = createExperimentController(api, config), body = input()
    await controller.start(body)
    corrupt(state.job)
    await assert.rejects(controller.stop({ experimentId: body.experimentId }), e => e.code === 'OWNERSHIP_CONFLICT')
    assert.equal(state.deletes, 0)
    assert.equal(state.patches, 0)
  }
  const { state, api } = backend()
  const controller = createExperimentController(api, config), body = input()
  await controller.start(body)
  const forged = pod(state.job)
  forged.metadata.ownerReferences[0].uid = 'not-the-owner'
  state.pods = [forged]
  await assert.rejects(controller.stop({ experimentId: body.experimentId }), e => e.code === 'OWNERSHIP_CONFLICT')
  assert.equal(state.deletes, 0)
})

test('partial cleanup is visible and retryable; pending deletion survives restart', async () => {
  const { state, api } = backend()
  const controller = createExperimentController(api, config), body = input()
  await controller.start(body)
  state.failDelete = true
  const partial = await controller.stop({ experimentId: body.experimentId })
  assert.equal(partial.availability, 'partial')
  assert.equal(partial.data.experiment.cleanup.status, 'failed')
  assert.equal(JSON.stringify(partial).includes('SECRET'), false)
  assert.equal((await controller.status()).data.experiment.cleanup.status, 'failed')
  state.failDelete = false
  state.deferDelete = true
  assert.equal((await controller.stop({ experimentId: body.experimentId })).data.experiment.state, 'stopping')
  const restarted = createExperimentController(api, config)
  assert.equal((await restarted.status()).data.experiment.cleanup.status, 'pending')
  state.job = null
  assert.equal((await restarted.status()).data.experiment.state, 'stopped')
})

test('orphaned pods and truncated discovery block new starts; terminal Jobs require cleanup', async () => {
  const { state, api } = backend()
  const controller = createExperimentController(api, config), body = input()
  await controller.start(body)
  state.pods = [pod(state.job)]
  state.job = null
  assert.equal((await controller.status()).data.experiment.state, 'cleanup-pending')
  await assert.rejects(controller.start(input()), e => e.status === 409)
  state.pods = []
  api.listPods = async () => ({ items: [], metadata: { continue: 'next' } })
  await assert.rejects(controller.start(input()), e => e.code === 'INCOMPLETE_DISCOVERY')
  const second = backend()
  const another = createExperimentController(second.api, config)
  await another.start(body)
  second.state.job.status = { conditions: [{ type: 'Complete', status: 'True' }] }
  assert.equal((await another.status()).data.experiment.state, 'completed')
  await assert.rejects(another.start(input()), e => e.status === 409)
})

async function usingServer(options, run) {
  let calls = 0
  const mock = { status: async () => { calls++; return { availability: 'available', data: {} } }, start: async body => { validateInput(body); calls++; return { availability: 'available' } }, stop: async body => { validateInput(body, true); calls++; return { availability: 'available' } } }
  const server = controllerServer(mock, options)
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try { await run(`http://127.0.0.1:${server.address().port}`, () => calls) } finally { await new Promise(resolve => server.close(resolve)) }
}
const post = body => ({ method: 'POST', headers: { origin: 'http://127.0.0.1:5173', 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
test('production and default controls fail closed; explicit authorization hook is required', async () => {
  for (const options of [{}, { enabled: true, production: true }]) await usingServer(options, async (url, calls) => {
    const response = await fetch(`${url}/api/cloud/experiment/start`, post(input()))
    assert.equal(response.status, 503)
    assert.equal((await response.json()).error.code, 'CONTROLS_DISABLED')
    assert.equal(calls(), 0)
  })
  await usingServer({ enabled: true, production: true, authorizeAdmin: async () => false }, async (url, calls) => {
    assert.equal((await fetch(`${url}/api/cloud/experiment/start`, post(input()))).status, 403)
    assert.equal(calls(), 0)
  })
})
test('local mutation requires explicit allowed Origin, JSON and exact routes', async () => {
  await usingServer({ enabled: true }, async (url, calls) => {
    assert.equal((await fetch(`${url}/api/cloud/experiment`)).status, 200)
    const request = post(input())
    delete request.headers.origin
    assert.equal((await fetch(`${url}/api/cloud/experiment/start`, request)).status, 403)
    request.headers.origin = 'https://outside.example'
    assert.equal((await fetch(`${url}/api/cloud/experiment/start`, request)).status, 403)
    assert.equal((await fetch(`${url}/api/cloud/experiment/start`, post({ ...input(), url: 'https://outside.example' }))).status, 400)
    assert.equal((await fetch(`${url}/api/cloud/experiment/start`, post(input()))).status, 200)
    assert.equal((await fetch(`${url}/api/cloud/experiment/exec`, post(input()))).status, 405)
    assert.equal((await fetch(`${url}/api/cloud/experiment/start`, { ...post(input()), body: 'x'.repeat(2049) })).status, 413)
    assert.equal(calls(), 2)
  })
})

test('same ID cannot race with different controls; missing terminal Job clears stale pod metadata', async () => {
  const { state, api } = backend()
  const a = createExperimentController(api, config), b = createExperimentController(api, config), body = input()
  const results = await Promise.allSettled([a.start(body), b.start({ ...body, concurrency: 8 })])
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1)
  assert.equal(results.find(result => result.status === 'rejected').reason.code, 'ID_REUSED')
  state.pods = [pod(state.job, 'Succeeded')]
  state.job.status = { conditions: [{ type: 'Complete', status: 'True', lastTransitionTime: '2026-10-20T12:00:30Z' }] }
  await a.status()
  state.job = null
  state.pods = []
  const status = await a.status()
  assert.equal(status.data.experiment.cleanup.status, 'complete')
  assert.equal(status.data.experiment.generatorPods.length, 0)
  assert.equal(status.data.experiment.endedAt, '2026-10-20T12:00:30.000Z')
})
