const { createServer } = require('node:http')
const { readFileSync, statSync } = require('node:fs')
const { timingSafeEqual } = require('node:crypto')
const client = require('@prometheus-io/client')

// Only fixed route templates are labels. Never label raw req.url, params, or identity.
const allowedRoutes = new Set([
  '/api/health', '/api/db-test',
  '/api/auth/login', '/api/auth/register', '/api/auth/me',
])
// Router-local templates are joined to bounded, explicit mount points. Unknown routes collapse.
const mounts = new Set(['/api/marks', '/api/analytics', '/api/fat', '/api/exams', '/api/roadmaps', '/api/tasks', '/api/auth'])
const templates = new Set(['/', '/:id', '/:studentId', '/:examId', '/:taskId', '/student/:studentId', '/subject/:subjectId', '/:id/status', '/:taskId/status', '/login', '/register', '/me', '/:roadmapId', '/generate/:examId', '/generate/roadmap/:roadmapId', '/adaptive/student/:studentId', '/optimize/student/:studentId', '/student/:studentId/subject/:subjectId', '/what-if/student/:studentId/subject/:subjectId'])
const methods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'])
function normalizedRoute(req) {
  const route = typeof req.route?.path === 'string' ? req.route.path : ''
  if (allowedRoutes.has(route)) return route
  return mounts.has(req.baseUrl) && templates.has(route) ? req.baseUrl + route : 'unmatched'
}
function createBackendMetrics() {
  const registry = new client.Registry()
  registry.setDefaultLabels({ service: 'academic-api' })
  const counter = new client.Counter({ name: 'cloudnest_http_requests_total', help: 'Academic API HTTP responses; only when opt-in instrumentation is enabled.', labelNames: ['route', 'method', 'status_class'], registers: [registry] })
  const histogram = new client.Histogram({ name: 'cloudnest_http_response_duration_seconds', help: 'Academic API response seconds, including auth/error responses.', labelNames: ['route', 'method', 'status_class'], buckets: [.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10], registers: [registry] })
  const middleware = (req, res, next) => {
    const start = process.hrtime.bigint()
    res.once('finish', () => {
      const labels = { route: normalizedRoute(req), method: methods.has(req.method) ? req.method : 'OTHER', status_class: `${Math.floor(res.statusCode / 100)}xx` }
      counter.inc(labels); histogram.observe(labels, Number(process.hrtime.bigint() - start) / 1e9)
    })
    next()
  }
  return { registry, middleware }
}
function registerBackendMetrics(app, env = process.env) {
  if (env.BACKEND_METRICS_ENABLED !== 'true') return null
  const path = env.BACKEND_METRICS_TOKEN_FILE
  if (!path || statSync(path).size > 4096) throw new Error('Configure BACKEND_METRICS_TOKEN_FILE')
  const token = readFileSync(path, 'utf8').trim()
  if (!/^[A-Za-z0-9_-]{32,256}$/.test(token)) throw new Error('Invalid backend metrics token file')
  const host = env.BACKEND_METRICS_BIND_HOST || '127.0.0.1', port = Number(env.BACKEND_METRICS_PORT || 9466)
  if (!['127.0.0.1', '0.0.0.0'].includes(host) || !Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid backend metrics listener')
  const metrics = createBackendMetrics(), expected = Buffer.from(`Bearer ${token}`)
  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    if (req.method !== 'GET' || req.url !== '/metrics') { res.writeHead(404); res.end(); return }
    const actual = Buffer.from(req.headers.authorization ?? '')
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) { res.writeHead(401); res.end(); return }
    try { const body = await metrics.registry.metrics(); res.writeHead(200, { 'Content-Type': metrics.registry.contentType }); res.end(body) } catch { res.writeHead(503); res.end() }
  })
  server.requestTimeout = 5000; server.headersTimeout = 5000
  server.setTimeout(5000, socket => socket.destroy())
  server.on('error', () => console.error('Backend metrics listener unavailable; check its port/bind configuration.'))
  server.listen(port, host)
  app.use(metrics.middleware)
  return { ...metrics, server }
}
module.exports = { createBackendMetrics, normalizedRoute, registerBackendMetrics }
