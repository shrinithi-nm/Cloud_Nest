import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'
import { createReaders } from './kubernetes.js'
import { collectSnapshot, snapshotCache } from './snapshot.js'
import { createMetrics, instrumentSnapshot, pollSnapshots } from './metrics.js'
import { startMetricsListener } from './metrics-server.js'
import { createObservability } from './observability.js'

export function monitoringServer(getSnapshot, { inCluster = false, metrics = createMetrics(), observability = createObservability() } = {}) {
  return createServer(async (req, res) => {
    metrics.observeHttp(req, res)
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    const send = (status, body) => { res.writeHead(status); res.end(JSON.stringify(body)) }
    if (req.method !== 'GET') return send(405, { error: 'Read-only service' })
    if (!inCluster) {
      if (![`127.0.0.1:${req.socket.localPort}`, `localhost:${req.socket.localPort}`].includes(req.headers.host)) return send(403, { error: 'Host denied' })
      if (req.headers.origin && !['http://localhost:5173', 'http://127.0.0.1:5173'].includes(req.headers.origin)) return send(403, { error: 'Origin denied' })
      if (req.headers['sec-fetch-site'] === 'cross-site') return send(403, { error: 'Cross-site request denied' })
    }
    if (req.url === '/healthz') return send(200, { status: 'ok', service: 'cloudnest-cloud-ops' })
    if (req.url === '/metrics') { try { const body = await metrics.registry.metrics(); res.writeHead(200, { 'Content-Type': metrics.registry.contentType }); res.end(body) } catch { send(503, { error: 'Metrics unavailable' }) } return }
    if (req.url === '/api/cloud/observability') { try { send(200, await observability()) } catch { send(503, { error: 'Observability unavailable' }) } return }
    if (req.url !== '/api/cloud/snapshot') return send(404, { error: 'Not found' })
    // In-cluster access must travel through an authenticated internal admin gateway.
    try { send(200, await getSnapshot()) } catch { send(503, { error: 'Snapshot unavailable' }) }
  })
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = { namespace: process.env.KUBE_NAMESPACE || 'default', deployment: process.env.KUBE_DEPLOYMENT || 'cloudnest-frontend', selector: process.env.KUBE_POD_SELECTOR || 'app=cloudnest-frontend', hpa: process.env.KUBE_HPA || 'cloudnest-frontend-hpa', inCluster: process.env.KUBE_MODE === 'in-cluster' }
  let readers
  try { readers = createReaders(config) } catch { readers = Object.fromEntries(['deployment', 'pods', 'metrics', 'hpa', 'events'].map(k => [k, async () => { throw new Error('Kubernetes configuration unavailable') }])) }
  const metrics = createMetrics()
  const getSnapshot = snapshotCache(instrumentSnapshot(() => collectSnapshot(readers, config), metrics))
  const observability = createObservability({ prometheusUrl: process.env.PROMETHEUS_URL, grafanaUrl: process.env.GRAFANA_URL })
  const listener = startMetricsListener(metrics)
  if (listener) pollSnapshots(getSnapshot)
  const port = Number(process.env.PORT || 4100)
  monitoringServer(getSnapshot, { inCluster: config.inCluster, metrics, observability }).listen(port, config.inCluster ? '0.0.0.0' : '127.0.0.1', () => console.log(`Cloud operations listening on port ${port} (${config.inCluster ? 'internal gateway required' : 'loopback only'})`))
}
