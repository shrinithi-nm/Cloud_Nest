import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { Script } from 'node:vm'
import { GENERATOR_SOURCE } from '../src/generator.js'

// Execute the actual generator source with an in-process HTTP stub. No traffic.
function harness(respond) {
  let now = 0, active = 0, peak = 0, requests = 0, destroyed = 0, agentDestroyed = false, finish
  const timers = [], handlers = {}, exits = []
  const done = new Promise(resolve => { finish = resolve })
  const http = {
    Agent: class { destroy() { agentDestroyed = true } },
    get(target, options, callback) {
      assert.equal(target, 'http://cloudnest-frontend-service.default.svc.cluster.local:80/')
      requests++; active++; peak = Math.max(peak, active)
      const req = new EventEmitter()
      req.destroy = () => { destroyed++; req.emit('close') }
      if (respond) queueMicrotask(() => {
        now = 10001
        const response = new EventEmitter()
        response.resume = () => queueMicrotask(() => { active--; response.emit('end') })
        callback(response)
      })
      return req
    },
  }
  const context = {
    require: name => { assert.equal(name, 'node:http'); return http },
    process: { env: { DURATION_SECONDS: '10', CONCURRENCY: '4', FRONTEND_TARGET: 'http://cloudnest-frontend-service.default.svc.cluster.local:80/' }, on: (name, fn) => { handlers[name] = fn }, exit: code => { exits.push(code); finish() } },
    Date: { now: () => now },
    setTimeout(fn, ms) { const timer = { fn, ms }; timers.push(timer); if (ms === 10) queueMicrotask(fn); return timer },
    clearTimeout() {},
  }
  new Script(GENERATOR_SOURCE).runInNewContext(context)
  return { done, timers, handlers, exits, stats: () => ({ requests, peak, destroyed, agentDestroyed }) }
}
test('actual generator opens concurrent requests and exits after the bounded worker loops', async () => {
  const run = harness(true)
  await run.done
  assert.equal(run.stats().peak, 4)
  assert.equal(run.stats().requests, 4)
  assert.equal(run.stats().agentDestroyed, true)
  assert.deepEqual(run.exits, [0])
})
test('independent duration timer and SIGTERM destroy in-flight requests', async () => {
  for (const signal of ['timer', 'SIGTERM']) {
    const run = harness(false)
    assert.equal(run.stats().requests, 4)
    if (signal === 'timer') run.timers.find(t => t.ms === 10000).fn()
    else run.handlers.SIGTERM()
    await run.done
    assert.equal(run.stats().destroyed, 4)
    assert.equal(run.stats().agentDestroyed, true)
    assert.deepEqual(run.exits, [0])
  }
})
