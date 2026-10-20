// This source is fixed by the server, passed directly to node (never a shell).
// It has no input for arbitrary URLs, paths, headers or scripts.
export const GENERATOR_IMAGE = 'node:24.12.0-alpine'
export const GENERATOR_SOURCE = `
const http = require('node:http');
const duration = Number(process.env.DURATION_SECONDS) * 1000;
const concurrency = Number(process.env.CONCURRENCY);
const target = process.env.FRONTEND_TARGET;
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 16 || duration < 10000 || duration > 120000 || !/^http:\\/\\/[a-z0-9-]+\\.[a-z0-9-]+\\.svc\\.cluster\\.local:80\\/$/.test(target)) process.exit(2);
const deadline = Date.now() + duration;
const agent = new http.Agent({ keepAlive: true, maxSockets: concurrency });
const active = new Set();
function finish() { for (const req of active) req.destroy(); agent.destroy(); process.exit(0); }
process.on('SIGTERM', finish);
process.on('SIGINT', finish);
setTimeout(finish, duration);
async function worker() {
  while (Date.now() < deadline) {
    await new Promise(resolve => {
      let settled = false;
      const request = http.get(target, { agent, headers: { 'User-Agent': 'CloudNest-frontend-experiment/1' } }, response => {
        response.resume();
        response.on('end', done);
        response.on('error', done);
      });
      active.add(request);
      // Absolute per-request deadline, not a socket-idle timeout.
      const timer = setTimeout(() => { request.destroy(); done(); }, 2000);
      function done() { if (settled) return; settled = true; clearTimeout(timer); active.delete(request); resolve(); }
      request.on('error', done);
      request.on('close', done);
    });
    // Bound unsuccessful retry pressure; each worker still runs independently.
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}
Promise.all(Array.from({ length: concurrency }, worker)).then(finish);
`
