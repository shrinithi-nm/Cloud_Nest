import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { createMetrics, instrumentSnapshot, normalizedRoute } from '../src/metrics.js'
import { metricsServer } from '../src/metrics-server.js'
import { createObservability, FIXED_QUERIES, boundedJson } from '../src/observability.js'
import { monitoringServer } from '../src/server.js'
import { loadAllYaml } from '@kubernetes/client-node'
const require = createRequire(import.meta.url)
const { createBackendMetrics, registerBackendMetrics } = require('../../backend/src/observability.cjs')
const express = require('../../backend/node_modules/express')

const snapshot = (time, partial = false) => ({ observedAt: new Date(time).toISOString(), availability: partial ? 'partial' : 'available', sections: { deployment: { availability: 'available', data: { desired: 2, ready: 1 } }, metrics: { availability: partial ? 'unavailable' : 'available', data: partial ? null : { cpuMillicores: 1.5, memoryBytes: 4096, pods: [{ timestamp: new Date(time).toISOString() }] } } } })
async function serve(server, callback) { await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); try { await callback(`http://127.0.0.1:${server.address().port}`) } finally { await new Promise(resolve => server.close(resolve)) } }
const metricLines = (text, name) => text.split('\n').filter(l => l.startsWith(name + '{') || l.startsWith(name + ' '))
test('isolated registries, repeated scrapes and route labels remain bounded and secret-free', async () => {
  const m = createMetrics()
  const metricCount = m.registry.getMetricsAsArray().length
  for (let i = 0; i < 250; i++) {
    const res = new EventEmitter(); res.statusCode = 200
    m.observeHttp({ method: 'GET', url: `/unknown/${i}?token=PRIVATE_FIXTURE` }, res); res.emit('finish')
  }
  const scrape = new EventEmitter(); scrape.statusCode = 200
  m.observeHttp({ method: 'GET', url: '/metrics' }, scrape); scrape.emit('finish')
  let text = await m.registry.metrics()
  assert.equal(metricLines(text, 'cloudnest_http_requests_total').length, 1)
  assert.match(text, /route="unmatched",method="GET",status_class="2xx".* 250/)
  assert.ok(!text.includes('PRIVATE_FIXTURE'))
  assert.ok(!text.includes('/unknown/'))
  for (let i = 0; i < 5; i++) text = await m.registry.metrics()
  assert.equal(m.registry.getMetricsAsArray().length, metricCount)
  assert.match(text, /cloudnest_process_resident_memory_bytes/)
  assert.equal(normalizedRoute('/api/cloud/snapshot?email=PRIVATE_FIXTURE'), '/api/cloud/snapshot')
  assert.notEqual(m.registry, createMetrics().registry)
})
test('partial snapshots and aging remove unavailable resource samples and expose freshness', async () => {
  let now = 1700000000000
  const m = createMetrics('monitoring', () => now)
  m.snapshot(snapshot(now))
  let text = await m.registry.metrics()
  assert.match(text, /cloudnest_workload_ready_replicas.* 1/)
  assert.match(text, /cloudnest_workload_cpu_cores.* 0.0015/)
  m.snapshot(snapshot(now, true))
  text = await m.registry.metrics()
  assert.equal(metricLines(text, 'cloudnest_workload_cpu_cores').length, 0)
  assert.match(text, /cloudnest_snapshot_refresh_total\{result="partial".* 1/)
  assert.match(text, /cloudnest_snapshot_fresh.* 1/)
  now += 31000
  text = await m.registry.metrics()
  assert.equal(metricLines(text, 'cloudnest_workload_ready_replicas').length, 0)
  assert.match(text, /cloudnest_snapshot_fresh.* 0/)
  assert.match(text, /cloudnest_snapshot_last_success_timestamp_seconds/)
  await assert.rejects(instrumentSnapshot(async () => { throw Error('PRIVATE_FIXTURE') }, m)())
  assert.match(await m.registry.metrics(), /cloudnest_snapshot_refresh_total\{result="failure".* 1/)
})
test('experiment identities never become labels and unknown state never becomes idle zero', async () => {
  const m = createMetrics('controller')
  m.experiment({ id: 'PRIVATE_FIXTURE', state: 'running' }); m.experiment({ id: 'PRIVATE_FIXTURE', state: 'running' })
  let text = await m.registry.metrics()
  assert.ok(!text.includes('PRIVATE_FIXTURE'))
  assert.match(text, /cloudnest_experiment_transitions_total\{state="running".* 1/)
  m.experimentUnknown()
  assert.equal(metricLines(await m.registry.metrics(), 'cloudnest_experiment_active').length, 0)
})
test('metrics-only listener requires bearer authentication and cannot proxy any control path', async () => {
  const m = createMetrics(), token = 'fixture_only_not_a_real_secret_123456789'
  await serve(metricsServer(m.registry, token), async url => {
    assert.equal((await fetch(`${url}/metrics`)).status, 401)
    assert.equal((await fetch(`${url}/metrics`, { headers: { Authorization: `Bearer ${token}` } })).status, 200)
    assert.equal((await fetch(`${url}/api/cloud/experiment/start`, { method: 'POST' })).status, 404)
    assert.equal((await fetch(`${url}/metrics?query=anything`)).status, 404)
  })
})
const vector = result => new Response(JSON.stringify({ status: 'success', data: { resultType: 'vector', result } }), { headers: { 'Content-Type': 'application/json' } })
test('fixed Prometheus queries are bounded, cached and mapped without arbitrary labels', async () => {
  let calls = 0
  const get = createObservability({ prometheusUrl: 'http://127.0.0.1:9090', grafanaUrl: 'http://127.0.0.1:3000/d/cloudnest', fetchImpl: async (url, options) => {
    calls++
    assert.ok(Object.values(FIXED_QUERIES).includes(url.searchParams.get('query')))
    assert.equal(options.redirect, 'error'); assert.ok(options.signal instanceof AbortSignal)
    if (url.searchParams.get('query') === FIXED_QUERIES.targets) return vector([{ metric: { job: 'cloud-ops', privateLabel: 'PRIVATE_FIXTURE' }, value: [1, '1'] }])
    if (url.searchParams.get('query') === FIXED_QUERIES.rules) return vector([{ metric: {}, value: [1, '4'] }])
    return vector([])
  } })
  const [a, b] = await Promise.all([get(), get()])
  assert.equal(calls, 3); assert.equal(a, b)
  assert.equal(a.data.prometheus, 'reachable'); assert.equal(a.data.alerts.status, 'clear')
  assert.ok(a.data.lastSuccessfulQueryAt); assert.ok(!JSON.stringify(a).includes('PRIVATE_FIXTURE'))
  assert.throws(() => createObservability({ grafanaUrl: 'javascript:alert(1)' }))
  assert.throws(() => createObservability({ prometheusUrl: 'http://user:password@localhost:9090' }))
})
test('unconfigured, failed, oversized and unloaded-rule observations remain unavailable', async () => {
  assert.equal((await createObservability()()).data.prometheus, 'unconfigured')
  const fail = createObservability({ prometheusUrl: 'http://localhost:9090', fetchImpl: async () => { throw Error('PRIVATE_FIXTURE') } })
  const result = await fail()
  assert.equal(result.availability, 'unavailable'); assert.equal(result.data.alerts.status, 'unavailable')
  assert.ok(!JSON.stringify(result).includes('PRIVATE_FIXTURE'))
  await assert.rejects(boundedJson(new Response('x'.repeat(65537))))
  const noRules = createObservability({ prometheusUrl: 'http://localhost:9090', fetchImpl: async () => vector([]) })
  assert.equal((await noRules()).data.alerts.status, 'unavailable')
})
test('observability failure is isolated and query parameters are never accepted by HTTP routing', async () => {
  await serve(monitoringServer(async () => ({ availability: 'available' })), async url => {
    const obs = await (await fetch(`${url}/api/cloud/observability`)).json()
    assert.equal(obs.availability, 'unavailable')
    assert.equal((await fetch(`${url}/api/cloud/observability?query=up`)).status, 404)
    assert.equal((await (await fetch(`${url}/api/cloud/snapshot`)).json()).availability, 'available')
    assert.equal((await fetch(`${url}/metrics`)).status, 200)
  })
})
test('backend module is opt-in and normalizes actual Express routes without any database', async () => {
  assert.equal(registerBackendMetrics({}, {}), null)
  const metrics = createBackendMetrics(), app = express(), router = express.Router()
  app.use(metrics.middleware)
  router.get('/:taskId', (req, res) => res.json({ ok: true }))
  app.use('/api/tasks', router)
  await serve(createServer(app), async url => {
    await fetch(`${url}/api/tasks/PRIVATE_FIXTURE_1`)
    await fetch(`${url}/api/tasks/PRIVATE_FIXTURE_2?email=PRIVATE_FIXTURE`)
    const text = await metrics.registry.metrics()
    assert.equal(metricLines(text, 'cloudnest_http_requests_total').length, 1)
    assert.ok(!text.includes('PRIVATE_FIXTURE'))
    assert.match(text, /route="\/api\/tasks\/:taskId"/)
  })
})
test('configuration and provisioning have fixed sources, low-cardinality rules and safe limits', () => {
  const yaml = file => loadAllYaml(readFileSync(new URL(`../../observability/${file}`, import.meta.url), 'utf8'))[0]
  const compose = yaml('compose.yaml'), config = yaml('prometheus/prometheus.yml'), rules = yaml('prometheus/alerts.yml')
  for (const filename of ['academic-targets.json', 'controller-targets.json']) assert.deepEqual(JSON.parse(readFileSync(new URL('../../observability/prometheus/' + filename, import.meta.url), 'utf8')), [])
  assert.equal(yaml('prometheus/alerts.test.yml').tests.length, 4)
  assert.ok(compose.services.prometheus.ports.every(p => p.startsWith('127.0.0.1:')))
  assert.ok(compose.services.grafana.ports.every(p => p.startsWith('127.0.0.1:')))
  assert.equal(compose.services.grafana.environment.GF_AUTH_ANONYMOUS_ENABLED, 'false')
  assert.ok(compose.services.prometheus.mem_limit); assert.ok(compose.services.grafana.mem_limit)
  assert.ok(!JSON.stringify(compose).includes('docker.sock'))
  assert.ok(!JSON.stringify(compose).includes('kubeconfig'))
  assert.equal(rules.groups[0].rules.length, 4)
  assert.ok(rules.groups[0].rules.every(r => r.for && r.expr && r.labels.severity))
  assert.match(rules.groups[0].rules[3].expr, />= 20/)
  assert.ok(config.scrape_configs.some(s => s.job_name === 'cloud-ops'))
  const dashboard = JSON.parse(readFileSync(new URL('../../observability/grafana/dashboards/cloudnest.json', import.meta.url), 'utf8'))
  assert.ok(dashboard.panels.some(p => p.title.includes('Academic API')))
  assert.ok(!JSON.stringify(dashboard).includes('or vector(0)'))
  assert.equal(yaml('grafana/provisioning/datasources/prometheus.yml').datasources[0].url, 'http://prometheus:9090')
})

test('query failures retain the last successful query time but never retain a healthy alert state', async () => {
  let time = 1700000000000, failure = false
  const get = createObservability({ prometheusUrl: 'http://localhost:9090', clock: () => new Date(time), fetchImpl: async url => {
    if (failure) throw Error('failure')
    return vector(url.searchParams.get('query') === FIXED_QUERIES.rules ? [{ metric: {}, value: [1, '4'] }] : [])
  } })
  const initial = await get()
  assert.equal(initial.data.alerts.status, 'clear')
  time += 11000; failure = true
  const failed = await get()
  assert.equal(failed.data.lastSuccessfulQueryAt, initial.data.lastSuccessfulQueryAt)
  assert.equal(failed.data.prometheus, 'unavailable')
  assert.equal(failed.data.alerts.status, 'unavailable')
  const invalid = createObservability({ prometheusUrl: 'http://localhost:9090', fetchImpl: async () => vector([{ metric: { job: 'cloud-ops' }, value: [1, 'NaN'] }]) })
  assert.equal((await invalid()).availability, 'unavailable')
})
test('query proxy aborts a stalled upstream without disturbing the snapshot service', async () => {
  const get = createObservability({ prometheusUrl: 'http://localhost:9090', fetchImpl: async (url, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })) })
  const keepAlive = setTimeout(() => {}, 4000)
  try { assert.equal((await get()).data.prometheus, 'unavailable') } finally { clearTimeout(keepAlive) }
})

test('shared snapshot cache counts actual refreshes once rather than each browser/cache hit', async () => {
  const { snapshotCache } = await import('../src/snapshot.js')
  const m = createMetrics(), get = snapshotCache(instrumentSnapshot(async () => snapshot(Date.now()), m))
  await Promise.all([get(), get(), get()]); await get()
  const text = await m.registry.metrics()
  assert.match(text, /cloudnest_snapshot_refresh_total\{result="success".* 1/)
})
test('backend login normalization remains a fixed route template and preserves responses', async () => {
  const metrics = createBackendMetrics(), app = express(), router = express.Router()
  app.use(metrics.middleware)
  router.post('/login', (req, res) => res.status(401).json({ error: 'unchanged' }))
  app.use('/api/auth', router)
  await serve(createServer(app), async url => {
    const response = await fetch(`${url}/api/auth/login`, { method: 'POST' })
    assert.equal(response.status, 401); assert.deepEqual(await response.json(), { error: 'unchanged' })
    assert.match(await metrics.registry.metrics(), /route="\/api\/auth\/login".*status_class="4xx"/)
    assert.equal((await fetch(`${url}/metrics`)).status, 404)
  })
})
