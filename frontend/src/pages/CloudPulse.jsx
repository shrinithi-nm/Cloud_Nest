import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Activity, Boxes, Cpu, MemoryStick, RefreshCw } from 'lucide-react'
import { getCloudSnapshot } from '../services/cloudApi'
import ScalingExperiment from '../components/ScalingExperiment'
import ObservabilityPanel from '../components/ObservabilityPanel'
import './CloudPulse.css'

const time = value => value ? new Date(value).toLocaleTimeString() : 'Unavailable'
const number = value => value == null ? 'Unavailable' : Math.round(value * 10) / 10

export default function CloudPulse() {
  const [snapshot, setSnapshot] = useState(null)
  const [history, setHistory] = useState([])
  const [experimentMarkers, setExperimentMarkers] = useState([])
  const recordExperiment = useCallback(experiment => {
    if (!experiment) return
    const markers = [{ id: experiment.id + ':start', time: experiment.requestedAt, label: 'Experiment requested' }, { id: experiment.id + ':stop', time: experiment.stopRequestedAt, label: 'Stop requested' }, { id: experiment.id + ':end', time: experiment.endedAt, label: 'Job ended' }].filter(marker => marker.time)
    setExperimentMarkers(previous => [...previous, ...markers.filter(marker => !previous.some(item => item.id === marker.id))].slice(-20))
  }, [])
  const [connection, setConnection] = useState('Connecting')
  const [busy, setBusy] = useState(false)
  const refreshRef = useRef(() => {})
  const reducedMotion = useReducedMotion()
  const refresh = useCallback(() => refreshRef.current(), [])
  useEffect(() => {
    let active = true, pending = false, timer, controller, failures = 0
    async function load() {
      if (pending || !active) return
      clearTimeout(timer)
      pending = true
      controller = new AbortController()
      setBusy(true)
      try {
        const next = await getCloudSnapshot(AbortSignal.any([controller.signal, AbortSignal.timeout(6500)]))
        if (!active) return
        if (next.availability === 'unavailable') throw new Error('Cluster unavailable')
        setSnapshot(next)
        setConnection(next.availability === 'partial' ? 'Partial connection' : 'Connected')
        const d = next.sections.deployment.data
        if (d && next.sections.deployment.availability === 'available') setHistory(previous => previous.at(-1)?.time === next.observedAt ? previous : [...previous, { time: next.observedAt, ready: d.ready, desired: d.desired }].slice(-60))
        failures = 0
      } catch {
        if (active) { failures++; setConnection('Connection unavailable') }
      } finally {
        pending = false
        if (active) { setBusy(false); timer = setTimeout(load, Math.min(30000, 5000 * 2 ** Math.min(failures, 3))) }
      }
    }
    refreshRef.current = load
    load()
    return () => { active = false; clearTimeout(timer); controller?.abort(); refreshRef.current = () => {} }
  }, [])
  const sections = snapshot?.sections
  const d = sections?.deployment.data
  const hpa = sections?.hpa.data
  const metrics = sections?.metrics.data
  const pods = sections?.pods.data
  const stale = connection === 'Connection unavailable' && Boolean(snapshot)
  const reconciled = d && d.observedGeneration != null && d.observedGeneration >= d.generation
  const health = !d ? 'Unavailable' : !reconciled ? 'Reconciling' : d.desired === 0 ? 'Scaled to zero' : d.ready >= d.desired && d.available >= d.desired && d.updated >= d.desired ? 'Healthy' : 'Converging'
  const changed = history.length > 1 && (history.at(-1).ready !== history.at(-2).ready || history.at(-1).desired !== history.at(-2).desired)
  const indicators = [
    { icon: Boxes, label: 'Ready / desired', value: d ? `${d.ready} / ${d.desired}` : 'Unavailable', detail: d ? `${d.updated} updated · ${d.available} available` : 'Deployment reading unavailable' },
    { icon: Cpu, label: 'CPU usage', value: metrics?.cpuMillicores == null ? 'Unavailable' : `${number(metrics.cpuMillicores)} mCPU`, detail: `HPA ${hpa?.currentCpuPercent == null ? 'unavailable' : `${hpa.currentCpuPercent}% of requests`} · target ${hpa?.targetCpuPercent == null ? 'unavailable' : `${hpa.targetCpuPercent}%`}` },
    { icon: MemoryStick, label: 'Memory usage', value: metrics?.memoryBytes == null ? 'Unavailable' : `${number(metrics.memoryBytes / 1048576)} MiB`, detail: metrics ? `${metrics.coverage} / ${metrics.totalPods ?? '?'} pods with metrics` : 'Resource metrics unavailable' },
    { icon: Activity, label: 'Workload health', value: health, detail: changed ? 'Replica change observed' : 'Based on Deployment readiness' },
  ]
  const max = Math.max(1, ...history.flatMap(p => [p.ready, p.desired]))
  const points = key => history.map(p => `${20 + (Date.parse(p.time) - Date.parse(history[0].time)) / Math.max(1, Date.parse(history.at(-1).time) - Date.parse(history[0].time)) * 560},${110 - p[key] / max * 90}`).join(' ')
  return <div className="cloud-pulse-page live-pulse">
    <header className="control-page-header cloud-pulse-header">
      <div><p className="control-eyebrow">Cloud Operations</p><h1>Cloud Pulse</h1><p>{snapshot ? `${snapshot.source.namespace} / ${snapshot.source.deployment}` : 'Waiting for workload identity'}</p></div>
      <button type="button" className="secondary-button pulse-refresh" onClick={refresh} disabled={busy}><RefreshCw size={16} className={busy && !reducedMotion ? 'refresh-spinning' : ''} />Refresh</button>
    </header>
    <div className={`live-connection ${stale ? 'live-stale' : ''}`} role="status"><span>{stale ? 'Stale · connection unavailable' : connection}</span><span>Last successful update: {snapshot ? time(snapshot.observedAt) : 'Waiting'}</span></div>
    <section className="pulse-grid" aria-label="Workload indicators">{indicators.map(({ icon: Icon, label, value, detail }) => <article className="pulse-card card" key={label}><div className="pulse-card-icon"><Icon size={21} /></div><p>{label}{stale ? ' · stale' : ''}</p><h3>{value}</h3><small>{detail}</small></article>)}</section>
    <ObservabilityPanel />
    <ScalingExperiment onObservation={recordExperiment} />
    <section className="command-panel"><div className="command-panel-heading"><div><p className="control-eyebrow">Observed runtime</p><h2>Pods {pods ? `· ${pods.length}` : ''}</h2></div><span className="live-muted">Running and Ready are separate states</span></div>
      {!pods ? <p>Pod reading unavailable.</p> : pods.length === 0 ? <p>No pods match the configured selector.</p> : <div className="live-pods"><AnimatePresence initial={false}>{pods.map(p => {
        const usage = metrics?.pods.find(m => m.name === p.name)
        return <motion.article layout={!reducedMotion} initial={reducedMotion ? false : { opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={reducedMotion ? undefined : { opacity: 0, scale: 0.97 }} transition={{ duration: 0.18 }} key={p.uid || p.name} className={`live-pod ${p.ready && !p.deletionTimestamp ? 'is-ready' : ''}`}>
          <Boxes size={20} /><strong>{p.name}</strong><span>{p.deletionTimestamp ? 'Terminating' : p.phase} · {p.ready ? 'Ready' : 'Not Ready'}</span><small>{p.restarts} restarts · created {p.createdAt ? new Date(p.createdAt).toLocaleString() : 'unavailable'}</small><small>CPU {usage?.cpuMillicores == null ? 'unavailable' : `${number(usage.cpuMillicores)} mCPU`} · Memory {usage?.memoryBytes == null ? 'unavailable' : `${number(usage.memoryBytes / 1048576)} MiB`}</small><small>Metrics sampled {time(usage?.timestamp)}{usage?.window ? ` · window ${usage.window}` : ''}</small>
        </motion.article>
      })}</AnimatePresence></div>}
    </section>
    <section className="command-panel"><div className="command-panel-heading"><h2>Recent replicas</h2><span className="live-muted">Browser session · up to 60 observations{stale ? ' · stale' : ''}</span></div>
      {history.length < 2 ? <p>Waiting for two successful Deployment observations.</p> : <><svg viewBox="0 0 600 140" role="img" aria-label={`Ready and desired replica history. Latest: ${history.at(-1).ready} ready, ${history.at(-1).desired} desired.`} className="live-history"><text x="0" y="20">{max}</text><text x="0" y="115">0</text><path d="M20 110H580" stroke="#dce3e9" />{experimentMarkers.filter(marker => Date.parse(marker.time) >= Date.parse(history[0].time) && Date.parse(marker.time) <= Date.parse(history.at(-1).time)).map(marker => { const x = 20 + (Date.parse(marker.time) - Date.parse(history[0].time)) / Math.max(1, Date.parse(history.at(-1).time) - Date.parse(history[0].time)) * 560; return <line key={marker.id} x1={x} x2={x} y1="15" y2="110" stroke="#b87530" strokeDasharray="2 4"><title>{marker.label} at {time(marker.time)}</title></line> })}<polyline points={points('desired')} fill="none" stroke="#6574bc" strokeWidth="2" strokeDasharray="5 4" /><polyline points={points('ready')} fill="none" stroke="#16806f" strokeWidth="3" />{history.map(p => <circle key={p.time} cx={20 + (Date.parse(p.time) - Date.parse(history[0].time)) / Math.max(1, Date.parse(history.at(-1).time) - Date.parse(history[0].time)) * 560} cy={110 - p.ready / max * 90} r="0"><title>{time(p.time)}: {p.ready} ready / {p.desired} desired</title></circle>)}</svg><div className="live-chart-caption"><span>{time(history[0].time)}</span><span>Solid: ready · dashed: desired</span><span>{time(history.at(-1).time)}</span></div></>}
    </section>
    {experimentMarkers.length > 0 && <p className="live-muted">Experiment markers (browser session): {experimentMarkers.slice(-4).map(marker => <span key={marker.id}>{marker.label} {time(marker.time)} · </span>)}</p>}
    <details className="command-panel live-details"><summary>Events & workload details{stale ? ' · stale' : ''}</summary><div className="live-detail-body">
      <p>HPA range: {hpa ? `${hpa.min}–${hpa.max}` : 'Unavailable'} · current / desired: {hpa ? `${hpa.current ?? 'Unavailable'} / ${hpa.desired ?? 'Unavailable'}` : 'Unavailable'}</p>
      {hpa?.conditions.map(c => <p key={c.type}>{c.type}: {c.status} · {c.reason} · {time(c.lastTransitionTime)}</p>)}
      {Object.entries(sections ?? {}).filter(([, s]) => s.error).map(([key, s]) => <p key={key} className="live-error">{key}: {s.error.message}</p>)}
      {!sections?.events.data ? <p>Events unavailable.</p> : !sections.events.data.length ? <p>No matching events in the last hour.</p> : <ol className="live-events">{sections.events.data.map(e => <li key={e.uid}><time>{time(e.time)}</time><strong>{e.reason} · {e.resource}</strong><p>{e.message} {e.count > 1 ? `(×${e.count})` : ''}</p></li>)}</ol>}
    </div></details>
  </div>
}
