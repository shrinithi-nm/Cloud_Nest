import { createServer } from 'node:http'
import { readFileSync, statSync } from 'node:fs'
import { timingSafeEqual } from 'node:crypto'

export function readMetricsToken(path) {
  if (!path || statSync(path).size > 4096) throw new Error('Configure a bounded metrics token file')
  const token = readFileSync(path, 'utf8').trim()
  if (!/^[A-Za-z0-9_-]{32,256}$/.test(token)) throw new Error('Metrics token must contain 32–256 URL-safe characters')
  return token
}
export function metricsServer(registry, token) {
  const expected = Buffer.from(`Bearer ${token}`)
  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    if (req.method !== 'GET' || req.url !== '/metrics') { res.writeHead(404); res.end(); return }
    const received = Buffer.from(req.headers.authorization ?? '')
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) { res.writeHead(401); res.end(); return }
    try { const body = await registry.metrics(); res.writeHead(200, { 'Content-Type': registry.contentType }); res.end(body) } catch { res.writeHead(503); res.end() }
  })
  server.requestTimeout = 5000; server.headersTimeout = 5000
  server.setTimeout(5000, socket => socket.destroy())
  return server
}
export function startMetricsListener(metrics, env = process.env, defaultPort = 9464) {
  if (env.METRICS_ENABLED !== 'true') return null
  const server = metricsServer(metrics.registry, readMetricsToken(env.METRICS_TOKEN_FILE))
  const host = env.METRICS_BIND_HOST || '127.0.0.1'
  const port = Number(env.METRICS_PORT || defaultPort)
  if (!['127.0.0.1', '0.0.0.0'].includes(host) || !Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid metrics listener configuration')
  server.on('error', () => console.error('Metrics listener unavailable; check its port and bind configuration.'))
  server.listen(port, host)
  return server
}
