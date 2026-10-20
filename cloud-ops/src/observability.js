const ALERT_NAMES = ['CloudNestMonitoringTargetUnavailable', 'CloudNestSnapshotStale', 'CloudNestReadyReplicaDeficit', 'CloudNestMonitoringErrorRatio']
export const FIXED_QUERIES = Object.freeze({
  targets: 'up{job=~"cloud-ops|cloud-controller|academic-api"}',
  alerts: `ALERTS{alertname=~"${ALERT_NAMES.join('|')}",alertstate=~"pending|firing"}`,
  rules: 'prometheus_rule_group_rules{rule_group=~".*cloudnest.*"}',
})
function safeUrl(value) {
  if (!value) return null
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Invalid observability URL')
  return url
}
export async function boundedJson(response, maximumBytes = 65536) {
  if (!response.ok || !response.body) { await response.body?.cancel(); throw new Error('Prometheus request unavailable') }
  if (Number(response.headers.get('content-length')) > maximumBytes) { await response.body.cancel(); throw new Error('Prometheus response too large') }
  const reader = response.body.getReader(), chunks = []
  let size = 0
  try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > maximumBytes) throw new Error('Prometheus response too large'); chunks.push(Buffer.from(value)) } }
  catch (error) { await reader.cancel(); throw error }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}
export function createObservability({ prometheusUrl, grafanaUrl, fetchImpl = fetch, clock = () => new Date() } = {}) {
  const base = safeUrl(prometheusUrl), grafana = safeUrl(grafanaUrl)
  let lastSuccessfulQueryAt = null, cached, expires = 0, pending
  const response = (data, error = null) => ({ observedAt: clock().toISOString(), source: { type: 'prometheus' }, availability: error ? 'unavailable' : 'available', data: { ...data, lastSuccessfulQueryAt, grafanaUrl: grafana?.toString() ?? null }, error })
  async function query(name) {
    const url = new URL(`${base.toString().replace(/\/$/, '')}/api/v1/query`)
    url.searchParams.set('query', FIXED_QUERIES[name]); url.searchParams.set('timeout', '2s')
    const result = await boundedJson(await fetchImpl(url, { signal: AbortSignal.timeout(2500), redirect: 'error', headers: { Accept: 'application/json' } }))
    if (result.status !== 'success' || result.data?.resultType !== 'vector' || !Array.isArray(result.data.result) || result.data.result.length > 50) throw new Error('Invalid Prometheus result')
    if (result.data.result.some(item => !item.metric || !Array.isArray(item.value) || item.value.length !== 2 || !Number.isFinite(Number(item.value[0])) || !Number.isFinite(Number(item.value[1])))) throw new Error('Invalid Prometheus sample')
    return result.data.result
  }
  async function collect() {
    if (!base) return response({ prometheus: 'unconfigured', alerts: { status: 'unavailable', items: [] }, targets: [] }, { code: 'PROMETHEUS_UNCONFIGURED', message: 'Prometheus is not configured.' })
    try {
      const [targets, alerts, rules] = await Promise.all([query('targets'), query('alerts'), query('rules')])
      const knownTargets = ['cloud-ops', 'cloud-controller', 'academic-api'].flatMap(job => {
        const samples = targets.filter(item => item.metric.job === job)
        if (samples.some(item => !['0', '1'].includes(item.value[1]))) throw new Error('Invalid scrape availability')
        return samples.length ? [{ job, up: samples.every(item => item.value[1] === '1') }] : []
      })
      const items = alerts.filter(item => ALERT_NAMES.includes(item.metric?.alertname) && ['pending', 'firing'].includes(item.metric?.alertstate)).filter(item => item.value[1] === '1').map(item => ({ name: item.metric.alertname, state: item.metric.alertstate })).filter((item, index, all) => all.findIndex(other => other.name === item.name && other.state === item.state) === index)
      const loaded = rules.length > 0 && rules.reduce((n, r) => n + (Number(r.value?.[1]) || 0), 0) >= 4
      lastSuccessfulQueryAt = clock().toISOString()
      return response({ prometheus: 'reachable', targets: knownTargets, alerts: { status: !loaded ? 'unavailable' : items.some(a => a.state === 'firing') ? 'firing' : items.length ? 'pending' : 'clear', items } })
    } catch { return response({ prometheus: 'unavailable', alerts: { status: 'unavailable', items: [] }, targets: [] }, { code: 'PROMETHEUS_UNAVAILABLE', message: 'Prometheus query unavailable, timed out or exceeded its response limit.' }) }
  }
  // Cache/deduplication is shared by tabs. Caller cannot supply query or target parameters.
  return async () => {
    if (cached && clock().getTime() < expires) return cached
    if (!pending) pending = collect().then(value => { cached = value; expires = clock().getTime() + 10000; return value }).finally(() => { pending = null })
    return pending
  }
}
