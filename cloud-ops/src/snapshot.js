import { podUsage } from './quantities.js'

const sections = ['deployment', 'pods', 'metrics', 'hpa', 'events']
const section = (data, error = null, availability = 'available') => ({ availability, data, error })
const safeError = error => ({ code: Number(error?.code) || null, message: 'Kubernetes reading unavailable; check connectivity, RBAC and resource configuration.' })
const count = value => value ?? 0

export async function collectSnapshot(readers, config, now = () => new Date()) {
  const results = await Promise.allSettled(sections.map(key => readers[key]()))
  const raw = {}, mapped = {}
  results.forEach((result, i) => {
    const key = sections[i]
    if (result.status === 'fulfilled') raw[key] = result.value
    else mapped[key] = section(null, safeError(result.reason), 'unavailable')
  })
  if (raw.deployment) {
    const d = raw.deployment
    mapped.deployment = section({ name: d.metadata?.name, desired: d.spec?.replicas ?? 1, updated: count(d.status?.updatedReplicas), ready: count(d.status?.readyReplicas), available: count(d.status?.availableReplicas), generation: d.metadata?.generation ?? null, observedGeneration: d.status?.observedGeneration ?? null })
  }
  if (raw.pods) mapped.pods = section(raw.pods.items.map(p => ({ uid: p.metadata?.uid, name: p.metadata?.name, phase: p.status?.phase ?? 'Unknown', ready: p.status?.conditions?.some(c => c.type === 'Ready' && c.status === 'True') ?? false, restarts: [...(p.status?.containerStatuses ?? []), ...(p.status?.initContainerStatuses ?? [])].reduce((n, c) => n + count(c.restartCount), 0), createdAt: p.metadata?.creationTimestamp ?? null, deletionTimestamp: p.metadata?.deletionTimestamp ?? null })), raw.pods.metadata?.continue ? { message: 'Pod results truncated at 200.' } : null, raw.pods.metadata?.continue ? 'partial' : 'available')
  if (raw.hpa) {
    const h = raw.hpa
    const cpu = items => items?.find(m => m.type === 'Resource' && m.resource?.name === 'cpu')?.resource
    mapped.hpa = section({ name: h.metadata?.name, min: h.spec?.minReplicas ?? 1, max: h.spec?.maxReplicas ?? null, current: h.status?.currentReplicas ?? null, desired: h.status?.desiredReplicas ?? null, targetCpuPercent: cpu(h.spec?.metrics)?.target?.averageUtilization ?? null, currentCpuPercent: cpu(h.status?.currentMetrics)?.current?.averageUtilization ?? null, conditions: (h.status?.conditions ?? []).map(c => ({ type: c.type, status: c.status, reason: c.reason, lastTransitionTime: c.lastTransitionTime })) })
  }
  if (raw.metrics) {
    const byName = new Map((raw.metrics.items ?? []).map(m => [m.metadata?.name, m]))
    const pods = mapped.pods?.data
    const usage = (pods ?? []).map(p => ({ name: p.name, ...podUsage(byName.get(p.name)) }))
    const complete = pods !== undefined && mapped.pods.availability === 'available' && !raw.metrics.metadata?.continue && usage.every(p => p.cpuMillicores !== null && p.memoryBytes !== null)
    mapped.metrics = section({ basis: 'Sum of all containers per observed pod; CPU in millicores, memory in bytes. HPA CPU percent is relative to CPU requests.', pods: usage, cpuMillicores: complete ? usage.reduce((n, p) => n + p.cpuMillicores, 0) : null, memoryBytes: complete ? usage.reduce((n, p) => n + p.memoryBytes, 0) : null, coverage: usage.filter(p => p.cpuMillicores !== null && p.memoryBytes !== null).length, totalPods: pods?.length ?? null }, complete ? null : { message: 'Metrics coverage incomplete; aggregate usage unavailable.' }, complete ? 'available' : 'partial')
  }
  const observedAt = now().toISOString()
  if (raw.events) {
    const identities = new Set([`Deployment/${config.deployment}`, `HorizontalPodAutoscaler/${config.hpa}`, ...(mapped.pods?.data ?? []).map(p => `Pod/${p.name}`)])
    const timestamp = e => e.lastTimestamp ?? e.eventTime ?? e.metadata?.creationTimestamp ?? null
    const events = raw.events.items.filter(e => identities.has(`${e.involvedObject?.kind}/${e.involvedObject?.name}`) && Date.parse(timestamp(e)) >= Date.parse(observedAt) - 3600000).sort((a, b) => Date.parse(timestamp(b)) - Date.parse(timestamp(a))).slice(0, 30).map(e => ({ uid: e.metadata?.uid, time: timestamp(e), type: e.type, reason: e.reason, message: e.message, resource: e.involvedObject?.name, count: e.count ?? 1 }))
    mapped.events = section(events, raw.events.metadata?.continue ? { message: 'Events query truncated at 200; some recent events may be omitted.' } : null, raw.events.metadata?.continue ? 'partial' : 'available')
  }
  const available = Object.values(mapped).filter(s => s.availability === 'available').length
  return { observedAt, source: { type: 'kubernetes', namespace: config.namespace, deployment: config.deployment, podSelector: config.selector, hpa: config.hpa }, availability: available === 5 ? 'available' : Object.values(mapped).every(s => s.availability === 'unavailable') ? 'unavailable' : 'partial', sections: mapped }
}

export function snapshotCache(collect, ttl = 4000) {
  let cached, expires = 0, pending
  return async () => {
    if (cached && Date.now() < expires) return cached
    if (!pending) pending = collect().then(value => { cached = value; expires = Date.now() + ttl; return value }).finally(() => { pending = null })
    return pending
  }
}
