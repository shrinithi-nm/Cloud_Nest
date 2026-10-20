import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'
import { BOUNDS, ControlError, controllerConfig, createExperimentController } from './experiments.js'
import { createControlApi } from './controller-kubernetes.js'
import { createMetrics, pollSnapshots } from './metrics.js'
import { startMetricsListener } from './metrics-server.js'

const ORIGINS = new Set(['http://localhost:5173', 'http://127.0.0.1:5173'])
async function readBody(req) {
  if (req.headers['content-type']?.split(';')[0] !== 'application/json') throw new ControlError(415, 'JSON_REQUIRED', 'Use application/json.')
  let size = 0, body = ''
  for await (const chunk of req) {
    size += chunk.length
    if (size > 2048) throw new ControlError(413, 'BODY_TOO_LARGE', 'Request body exceeds 2 KiB.')
    body += chunk.toString('utf8')
  }
  try { return JSON.parse(body) } catch { throw new ControlError(400, 'INVALID_JSON', 'Invalid JSON body.') }
}
// Production integration hook must verify the existing server-side admin session.
// No environment variable or browser role/header enables authorization by itself.
export function controllerServer(controller, { enabled = false, production = false, authorizeAdmin, namespace = 'default', metrics = createMetrics('controller') } = {}) {
  const usable = enabled && (!production || typeof authorizeAdmin === 'function') && Boolean(controller)
  const envelope = (error, data = null) => ({ observedAt: new Date().toISOString(), source: { type: 'kubernetes-controller', namespace }, availability: 'unavailable', data, error })
  const server = createServer(async (req, res) => {
    metrics.observeHttp(req, res)
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    const send = (status, body) => { res.writeHead(status); res.end(JSON.stringify(body)) }
    try {
      if (!production) {
        if (![`127.0.0.1:${req.socket.localPort}`, `localhost:${req.socket.localPort}`].includes(req.headers.host)) throw new ControlError(403, 'HOST_DENIED', 'Host denied.')
        if (req.headers.origin && !ORIGINS.has(req.headers.origin) || req.headers['sec-fetch-site'] === 'cross-site') throw new ControlError(403, 'ORIGIN_DENIED', 'Origin denied.')
      }
      if (req.url === '/healthz' && req.method === 'GET') return send(200, { status: 'ok', service: 'cloudnest-load-controller' })
      const valid = req.url === '/api/cloud/experiment' && req.method === 'GET' || ['/api/cloud/experiment/start', '/api/cloud/experiment/stop'].includes(req.url) && req.method === 'POST'
      if (!valid) throw new ControlError(req.method === 'GET' ? 404 : 405, 'ROUTE_DENIED', 'Unsupported experiment route or method.')
      if (!usable) return send(503, envelope({ code: 'CONTROLS_DISABLED', message: 'Frontend traffic controls are disabled. Local opt-in or reviewed server-side admin authorization is required.' }, { enabled: false, bounds: BOUNDS, experiment: null }))
      if (production && await authorizeAdmin(req) !== true) throw new ControlError(403, 'ADMIN_REQUIRED', 'Verified administrator authorization is required.')
      if (req.method === 'GET') { const result = await controller.status(); Object.hasOwn(result.data ?? {}, 'experiment') ? metrics.experiment(result.data.experiment) : metrics.experimentUnknown(); return send(200, result) }
      // A browser must send an explicit allowed Origin on every local mutation.
      if (!production && !ORIGINS.has(req.headers.origin)) throw new ControlError(403, 'ORIGIN_REQUIRED', 'An allowed browser Origin is required for mutations.')
      const body = await readBody(req)
      const action = req.url.endsWith('/start') ? 'start' : 'stop'
      const result = await controller[action](body)
      metrics.action(action, result.availability === 'available' ? 'confirmed' : 'partial')
      Object.hasOwn(result.data ?? {}, 'experiment') ? metrics.experiment(result.data.experiment) : metrics.experimentUnknown()
      return send(200, result)
    } catch (error) {
      metrics.experimentUnknown()
      if (req.method === 'POST' && ['/api/cloud/experiment/start', '/api/cloud/experiment/stop'].includes(req.url)) metrics.action(req.url.endsWith('/start') ? 'start' : 'stop', 'failed')
      return send(error instanceof ControlError ? error.status : 503, envelope({ code: error instanceof ControlError ? error.code : 'CONTROLLER_UNAVAILABLE', message: error instanceof ControlError ? error.message : 'Controller operation could not be confirmed. Refresh status before retrying.' }))
    }
  })
  server.requestTimeout = 5000
  server.headersTimeout = 5000
  server.setTimeout(20000, socket => socket.destroy())
  return server
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = controllerConfig()
  const production = config.inCluster || process.env.NODE_ENV === 'production'
  const enabled = process.env.CLOUD_LOAD_ENABLED === 'true' && !production
  let controller
  // Disabled startup never creates a Kubernetes client or touches the cluster.
  if (enabled) controller = createExperimentController(createControlApi(config), config)
  const metrics = createMetrics('controller')
  const listener = startMetricsListener(metrics, process.env, 9465)
  if (listener && controller) pollSnapshots(async () => { try { const result = await controller.status(); Object.hasOwn(result.data ?? {}, 'experiment') ? metrics.experiment(result.data.experiment) : metrics.experimentUnknown() } catch { metrics.experimentUnknown() } })
  const port = Number(process.env.CONTROLLER_PORT || 4101)
  controllerServer(controller, { enabled, production, namespace: config.namespace, metrics }).listen(port, config.inCluster ? '0.0.0.0' : '127.0.0.1', () => console.log(`Load controller on port ${port}; controls ${enabled ? 'locally enabled' : 'disabled'}`))
}
