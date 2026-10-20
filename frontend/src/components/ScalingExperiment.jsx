import { useEffect, useRef, useState } from 'react'
import { Play, Square } from 'lucide-react'
import { cloudExperiment } from '../services/cloudApi'

const stoppedStates = new Set(['completed', 'failed', 'stopped', 'finished'])
export default function ScalingExperiment({ onObservation }) {
  const [result, setResult] = useState(null)
  const [duration, setDuration] = useState(30)
  const [concurrency, setConcurrency] = useState(4)
  const [busy, setBusy] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  const [operationError, setOperationError] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const dialog = useRef(null)
  const actionRef = useRef(async () => {})
  const observerRef = useRef(onObservation)
  const startInput = useRef(null)
  useEffect(() => { observerRef.current = onObservation }, [onObservation])

  useEffect(() => {
    let active = true, pending = false, timer, request, failures = 0
    async function load(action = '', body) {
      if (!active || pending) return
      pending = true
      clearTimeout(timer)
      request = new AbortController()
      setBusy(true)
      if (action) setOperationError('')
      try {
        // A stop can require several bounded Kubernetes calls; never retry a POST automatically.
        const next = await cloudExperiment(action, body, AbortSignal.any([request.signal, AbortSignal.timeout(18000)]))
        if (!active) return
        setResult(next)
        setConnectionError('')
        if (action && next.error) setOperationError(next.error.message)
        if (action === 'start' && next.availability === 'available') startInput.current = null
        observerRef.current?.(next.data.experiment)
        failures = 0
      } catch (error) {
        if (active) {
          failures++
          if (action) setOperationError(`${error.message} Refresh status before retrying; the Job deadline still applies.`)
          else setConnectionError('Controller unavailable; experiment status may be stale.')
        }
      } finally {
        pending = false
        if (active) { setBusy(false); timer = setTimeout(() => load(), Math.min(30000, 5000 * 2 ** Math.min(failures, 3))) }
      }
    }
    actionRef.current = load
    load()
    const clock = setInterval(() => setNow(Date.now()), 1000)
    return () => { active = false; clearTimeout(timer); clearInterval(clock); request?.abort(); actionRef.current = async () => {} }
  }, [])

  const data = result?.data
  const experiment = data?.experiment
  const bounds = data?.bounds
  const enabled = data?.enabled === true && !connectionError
  const final = experiment && stoppedStates.has(experiment.state)
  const mustClean = experiment && (!final || ['retained', 'pending', 'failed'].includes(experiment.cleanup.status))
  const valid = Number.isInteger(duration) && Number.isInteger(concurrency) && bounds && duration >= bounds.minDuration && duration <= bounds.maxDuration && concurrency >= bounds.minConcurrency && concurrency <= bounds.maxConcurrency
  const elapsed = experiment?.startedAt ? Math.max(0, Math.floor(((experiment.endedAt ? Date.parse(experiment.endedAt) : now) - Date.parse(experiment.startedAt)) / 1000)) : 0
  const remaining = experiment?.durationSeconds == null ? null : Math.max(0, experiment.durationSeconds - elapsed)
  async function start() {
    dialog.current.close()
    if (!startInput.current || startInput.current.durationSeconds !== duration || startInput.current.concurrency !== concurrency) startInput.current = { experimentId: crypto.randomUUID(), durationSeconds: duration, concurrency }
    await actionRef.current('start', startInput.current)
  }
  return <section className="command-panel experiment-panel" aria-labelledby="experiment-heading">
    <div className="command-panel-heading"><div><p className="control-eyebrow">Scaling experiment</p><h2 id="experiment-heading">Frontend traffic test</h2></div><span className="live-muted" role="status">{connectionError ? 'Status stale' : !data ? 'Connecting' : !enabled ? 'Controls disabled' : experiment?.state ?? 'Idle'}</span></div>
    <p className="experiment-description">Sends bounded traffic to the frontend Service. Observe real CPU and replica changes; this does not measure authenticated students or backend capacity.</p>
    <div className="experiment-controls">
      <label>Duration (seconds)<input type="number" min={bounds?.minDuration ?? 10} max={bounds?.maxDuration ?? 120} step="1" value={duration} onChange={event => setDuration(event.target.value === '' ? '' : Number(event.target.value))} disabled={!enabled || busy || Boolean(mustClean)} /><small>{bounds?.minDuration ?? 10}–{bounds?.maxDuration ?? 120} seconds</small></label>
      <label>Concurrent requests<input type="number" min={bounds?.minConcurrency ?? 1} max={bounds?.maxConcurrency ?? 16} step="1" value={concurrency} onChange={event => setConcurrency(event.target.value === '' ? '' : Number(event.target.value))} disabled={!enabled || busy || Boolean(mustClean)} /><small>{bounds?.minConcurrency ?? 1}–{bounds?.maxConcurrency ?? 16} workers</small></label>
      <div className="experiment-actions"><button type="button" className="secondary-button" disabled={!enabled || busy || Boolean(mustClean) || !valid} onClick={() => dialog.current.showModal()}><Play size={15} />Start</button><button type="button" className="secondary-button" disabled={!enabled || busy || !experiment || !mustClean} onClick={() => actionRef.current('stop', { experimentId: experiment.id })}><Square size={15} />{final ? 'Clean up Job' : experiment?.cleanup.status === 'failed' ? 'Retry Stop' : 'Stop'}</button></div>
    </div>
    <div className="experiment-status" role="status">
      {connectionError && <p className="live-error">{connectionError}</p>}
      {result?.error?.code === 'CONTROLS_DISABLED' && <p>{result.error.message}</p>}
      {operationError && <p className="live-error">{operationError}</p>}
      {experiment && <><p>{experiment.state === 'stopped' ? 'Load stopped; observing scale-down' : experiment.state === 'stopping' || experiment.state === 'cleanup-pending' ? 'Stop requested; verifying generator termination' : ['completed', 'finished'].includes(experiment.state) ? 'Traffic Job ended; observing workload behavior' : experiment.state === 'failed' ? 'Traffic Job failed; inspect generator state' : `${experiment.state === 'pending' ? 'Waiting for generator startup' : 'Experiment running'} · ${elapsed}s elapsed${remaining == null ? '' : ` · approximately ${remaining}s remaining`}`}</p><small>Generator pods: {experiment.generatorPods.length} · cleanup: {experiment.cleanup.status}</small>{experiment.cleanup.message && <p>{experiment.cleanup.message}</p>}</>}
    </div>
    <details className="live-details"><summary>Experiment details</summary><div className="live-detail-body"><p>Target: {data?.target ?? 'Configured frontend Service only'} · fixed path /</p><p>One generator Job, separate from application replicas. Two-second request deadlines; at most 120 seconds of traffic. Kubernetes Job/Pod deadlines allow 15 seconds of startup overhead. No measured request-rate, error-rate or latency statistics are collected.</p>{experiment && <><p>Experiment: {experiment.id}</p><p>Requested: {experiment.requestedAt ? new Date(experiment.requestedAt).toLocaleString() : 'Unavailable'} · ended: {experiment.endedAt ? new Date(experiment.endedAt).toLocaleString() : 'Not observed'}</p><p>Controls: {experiment.durationSeconds ?? '?'} seconds / {experiment.concurrency ?? '?'} concurrent requests</p>{experiment.generatorPods.map(p => <p key={p.name}>{p.name}: {p.phase}{p.terminating ? ' · terminating' : ''}</p>)}</>}</div></details>
    <dialog ref={dialog} className="experiment-confirm" aria-labelledby="experiment-confirm-title"><h2 id="experiment-confirm-title">Start frontend traffic?</h2><p>This will create one Kubernetes Job with {concurrency} concurrent requests for up to {duration} seconds against the configured frontend Service. It consumes cluster resources and may trigger HPA scaling.</p><p>The server stops traffic independently of this browser. Replica reduction afterward depends on actual HPA conditions.</p><div className="experiment-actions"><button type="button" className="secondary-button" onClick={() => dialog.current.close()}>Cancel</button><button type="button" className="secondary-button" disabled={busy || !enabled || !valid} onClick={start}>Confirm and start</button></div></dialog>
  </section>
}
