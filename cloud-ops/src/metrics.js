import client from '@prometheus-io/client'

const ROUTES = new Set(['/healthz', '/api/cloud/snapshot', '/api/cloud/observability', '/api/cloud/experiment', '/api/cloud/experiment/start', '/api/cloud/experiment/stop'])
const METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])
const SECTIONS = ['deployment', 'pods', 'metrics', 'hpa', 'events']
const STATES = new Set(['idle', 'pending', 'running', 'stopping', 'cleanup-pending', 'completed', 'failed', 'stopped', 'finished'])
export const normalizedRoute = url => ROUTES.has(url?.split('?')[0]) ? url.split('?')[0] : 'unmatched'

export function createMetrics(service = 'monitoring', clock = () => Date.now()) {
  if (!['monitoring', 'controller'].includes(service)) throw new Error('Unknown metric service')
  const registry = new client.Registry()
  registry.setDefaultLabels({ service })
  const counter = (name, help, labelNames = []) => new client.Counter({ name: `cloudnest_${name}`, help, labelNames, registers: [registry] })
  const gauge = (name, help, collect, labelNames = []) => new client.Gauge({ name: `cloudnest_${name}`, help, collect, labelNames, registers: [registry] })
  const requests = counter('http_requests_total', 'Completed HTTP responses, excluding metrics scrapes.', ['route', 'method', 'status_class'])
  const duration = new client.Histogram({ name: 'cloudnest_http_response_duration_seconds', help: 'Service HTTP response duration; not academic API latency.', labelNames: ['route', 'method', 'status_class'], buckets: [.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10], registers: [registry] })
  let cpuObserved = 0
  counter('process_cpu_seconds_total', 'Actual process user plus system CPU seconds.').collect = function () {
    const cpu = process.cpuUsage(), total = (cpu.user + cpu.system) / 1e6
    this.inc(Math.max(0, total - cpuObserved)); cpuObserved = total
  }
  gauge('process_resident_memory_bytes', 'Actual process resident memory.', function () { this.set(process.memoryUsage().rss) })
  gauge('process_heap_used_bytes', 'Actual process heap used.', function () { this.set(process.memoryUsage().heapUsed) })
  gauge('process_uptime_seconds', 'Actual process uptime.', function () { this.set(process.uptime()) })
  let snapshot, lastSuccess, experiment, experimentObservedAt, lastIdentity, lastState
  const refreshes = counter('snapshot_refresh_total', 'Actual shared snapshot collections; cache hits excluded.', ['result'])
  const lifecycle = counter('experiment_transitions_total', 'Observed experiment state transitions, not request or student counts.', ['state'])
  const actions = counter('experiment_actions_total', 'Controller operations by bounded outcome.', ['action', 'result'])
  const snapshotFresh = () => snapshot && clock() - Date.parse(snapshot.observedAt) <= 30000
  gauge('snapshot_last_success_timestamp_seconds', 'Last collection with an available Deployment reading; absent before first success.', function () { this.remove(); if (lastSuccess) this.set(lastSuccess / 1000) })
  gauge('snapshot_fresh', '1 only when latest Deployment reading is available and <=30s old.', function () { this.set(snapshotFresh() && snapshot.sections.deployment?.availability === 'available' ? 1 : 0) })
  gauge('snapshot_section_available', '1 for a fully available section in a collection <=30s old; 0 otherwise.', function () { for (const section of SECTIONS) this.set({ section }, snapshotFresh() && snapshot.sections[section]?.availability === 'available' ? 1 : 0) }, ['section'])
  for (const [field, name] of [['desired', 'workload_desired_replicas'], ['ready', 'workload_ready_replicas']]) gauge(name, 'Observed Deployment replicas; absent when unavailable or stale.', function () {
    this.remove(); const section = snapshot?.sections.deployment
    if (snapshotFresh() && section?.availability === 'available' && Number.isFinite(section.data?.[field])) this.set(section.data[field])
  })
  const usageFresh = () => snapshotFresh() && snapshot.sections.metrics?.availability === 'available' && snapshot.sections.metrics.data?.pods?.length > 0 && snapshot.sections.metrics.data.pods.every(p => p.timestamp && clock() - Date.parse(p.timestamp) <= 60000)
  for (const [field, name, scale] of [['cpuMillicores', 'workload_cpu_cores', .001], ['memoryBytes', 'workload_memory_bytes', 1]]) gauge(name, 'Sum of observed application pod resource usage; absent if unavailable/stale. Not node capacity.', function () {
    this.remove(); const value = snapshot?.sections.metrics?.data?.[field]
    if (usageFresh() && Number.isFinite(value)) this.set(value * scale)
  })
  gauge('workload_metrics_timestamp_seconds', 'Oldest resource metrics sample timestamp in the aggregate.', function () { this.remove(); if (usageFresh()) this.set(Math.min(...snapshot.sections.metrics.data.pods.map(p => Date.parse(p.timestamp))) / 1000) })
  gauge('experiment_active', '1 if an observed experiment is pending/running/stopping, 0 if observed idle/terminal; absent if unknown or >30s old.', function () {
    this.remove(); if (experimentObservedAt && clock() - experimentObservedAt <= 30000) this.set(experiment && !['completed', 'failed', 'stopped', 'finished'].includes(experiment.state) ? 1 : 0)
  })
  return {
    registry,
    observeHttp(req, res) {
      if (req.url?.split('?')[0] === '/metrics') return
      const start = process.hrtime.bigint()
      res.once('finish', () => {
        const status = Math.floor(res.statusCode / 100)
        const labels = { route: normalizedRoute(req.url), method: METHODS.has(req.method) ? req.method : 'OTHER', status_class: status >= 1 && status <= 5 ? `${status}xx` : 'other' }
        requests.inc(labels); duration.observe(labels, Number(process.hrtime.bigint() - start) / 1e9)
      })
    },
    snapshot(value) {
      snapshot = value
      refreshes.inc({ result: value.availability === 'available' ? 'success' : value.availability === 'partial' ? 'partial' : 'failure' })
      if (value.sections.deployment?.availability === 'available') lastSuccess = Date.parse(value.observedAt)
    },
    snapshotFailure() { snapshot = undefined; refreshes.inc({ result: 'failure' }) },
    experiment(value) {
      const state = value?.state ?? 'idle'
      if (!STATES.has(state)) { experimentObservedAt = undefined; return }
      experiment = value; experimentObservedAt = clock()
      // Identity is retained only internally to distinguish observations; never exported as a label.
      if (value?.id !== lastIdentity || state !== lastState) { lifecycle.inc({ state }); lastIdentity = value?.id; lastState = state }
    },
    experimentUnknown() { experimentObservedAt = undefined },
    action(action, result) { if (['start', 'stop'].includes(action) && ['confirmed', 'partial', 'failed'].includes(result)) actions.inc({ action, result }) },
  }
}

export function instrumentSnapshot(collect, metrics) {
  return async () => { try { const value = await collect(); metrics.snapshot(value); return value } catch (error) { metrics.snapshotFailure(); throw error } }
}
export function pollSnapshots(getSnapshot, interval = 5000) {
  let stopped = false, timer
  async function poll() { try { await getSnapshot() } catch { /* Availability is exported by instrumentation. */ } finally { if (!stopped) { timer = setTimeout(poll, interval); timer.unref() } } }
  poll()
  return () => { stopped = true; clearTimeout(timer) }
}
