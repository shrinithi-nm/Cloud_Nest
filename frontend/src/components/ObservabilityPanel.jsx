import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { getObservability } from '../services/cloudApi'

export default function ObservabilityPanel() {
  const [result, setResult] = useState(null)
  const [failed, setFailed] = useState(false)
  const reducedMotion = useReducedMotion()
  useEffect(() => {
    let active = true, timer, controller, failures = 0
    async function load() {
      controller = new AbortController()
      try {
        const next = await getObservability(AbortSignal.any([controller.signal, AbortSignal.timeout(4500)]))
        if (active) { setResult(next); setFailed(false); failures = 0 }
      } catch { if (active) { setFailed(true); failures++ } }
      finally { if (active) timer = setTimeout(load, Math.min(60000, 15000 * 2 ** Math.min(failures, 2))) }
    }
    load()
    return () => { active = false; clearTimeout(timer); controller?.abort() }
  }, [])
  const data = result?.data
  const reachable = !failed && data?.prometheus === 'reachable'
  const alertStatus = reachable ? data?.alerts.status : 'unavailable'
  const summary = alertStatus === 'clear' ? 'No active alerts' : alertStatus === 'firing' ? 'Alerts firing' : alertStatus === 'pending' ? 'Alerts pending' : 'Alert evaluation unavailable'
  return <motion.section className="command-panel observability-panel" aria-labelledby="observability-heading" initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .18 }}>
    <div className="command-panel-heading"><h2 id="observability-heading">Observability</h2>{data?.grafanaUrl ? <a className="observability-link" href={data.grafanaUrl} target="_blank" rel="noreferrer">Grafana <ExternalLink size={14} /></a> : <span className="live-muted">Grafana not configured</span>}</div>
    <div className="observability-summary" role="status"><span><strong>Prometheus</strong> {reachable ? 'Reachable' : !result && !failed ? 'Connecting' : data?.prometheus === 'unconfigured' && !failed ? 'Not configured' : 'Unavailable'}</span><span>{summary}</span></div>
    <p className="live-muted">Last successful query: {data?.lastSuccessfulQueryAt ? new Date(data.lastSuccessfulQueryAt).toLocaleTimeString() : 'None yet'}{failed && result ? ' · last response stale' : ''}</p>
    <details className="live-details"><summary>Monitoring details</summary><div className="live-detail-body">
      {failed ? <p>Observability connection unavailable. Kubernetes monitoring remains separate.</p> : result?.error ? <p>{result.error.message}</p> : !result ? <p>Waiting for the first response.</p> : <><p>Monitoring-service measurements are separate from academic API performance.</p>{!data.targets.length ? <p>No configured scrape targets were returned.</p> : data.targets.map(target => <p key={target.job}>{target.job}: {target.up ? 'scrape available' : 'scrape unavailable'}</p>)}{data.alerts.items.map(alert => <p key={`${alert.name}:${alert.state}`}>{alert.name}: {alert.state}</p>)}{alertStatus === 'unavailable' && <p>CloudNest alert rules have not been confirmed loaded.</p>}</>}
    </div></details>
  </motion.section>
}
