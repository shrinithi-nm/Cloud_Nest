import { GENERATOR_IMAGE, GENERATOR_SOURCE } from './generator.js'

export const JOB_NAME = 'cloudnest-frontend-traffic'
export const FEATURE_LABEL = 'cloudnest.io/feature'
export const EXPERIMENT_LABEL = 'cloudnest.io/experiment-id'
export const FEATURE = 'frontend-traffic-v1'
export const SELECTOR = `${FEATURE_LABEL}=${FEATURE}`
export const BOUNDS = Object.freeze({ minDuration: 10, maxDuration: 120, defaultDuration: 30, minConcurrency: 1, maxConcurrency: 16, defaultConcurrency: 4 })
const ANNOTATION = 'cloudnest.io/'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const terminal = new Set(['completed', 'failed', 'stopped', 'finished'])
export class ControlError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code }
}
export function validateInput(body, stop = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ControlError(400, 'INVALID_INPUT', 'A JSON object is required.')
  const allowed = stop ? ['experimentId'] : ['experimentId', 'durationSeconds', 'concurrency']
  if (Object.keys(body).some(key => !allowed.includes(key)) || !UUID.test(body.experimentId ?? '')) throw new ControlError(400, 'INVALID_INPUT', 'Only a UUID experimentId and the documented controls are accepted.')
  if (stop) return body
  const durationSeconds = body.durationSeconds ?? BOUNDS.defaultDuration
  const concurrency = body.concurrency ?? BOUNDS.defaultConcurrency
  if (!Number.isInteger(durationSeconds) || durationSeconds < BOUNDS.minDuration || durationSeconds > BOUNDS.maxDuration || !Number.isInteger(concurrency) || concurrency < BOUNDS.minConcurrency || concurrency > BOUNDS.maxConcurrency) throw new ControlError(400, 'INVALID_BOUNDS', 'Duration must be 10–120 seconds and concurrency 1–16, both integers.')
  return { experimentId: body.experimentId, durationSeconds, concurrency }
}
export function controllerConfig(env = process.env) {
  const namespace = env.KUBE_NAMESPACE || 'default'
  const service = env.KUBE_FRONTEND_SERVICE || 'cloudnest-frontend-service'
  const dns = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/
  if (![namespace, service].every(value => dns.test(value))) throw new Error('Invalid namespace or frontend Service name')
  return { namespace, service, target: `http://${service}.${namespace}.svc.cluster.local:80/`, inCluster: env.KUBE_MODE === 'in-cluster', context: env.KUBE_CONTROLLER_CONTEXT || env.KUBE_CONTEXT }
}
export function buildJob(config, input, now = new Date().toISOString()) {
  const labels = { [FEATURE_LABEL]: FEATURE, [EXPERIMENT_LABEL]: input.experimentId, 'app.kubernetes.io/name': JOB_NAME }
  return { apiVersion: 'batch/v1', kind: 'Job', metadata: { name: JOB_NAME, namespace: config.namespace, labels, annotations: { [`${ANNOTATION}requested-at`]: now, [`${ANNOTATION}duration`]: String(input.durationSeconds), [`${ANNOTATION}concurrency`]: String(input.concurrency), [`${ANNOTATION}target`]: config.target } }, spec: {
    completions: 1, parallelism: 1, backoffLimit: 0, activeDeadlineSeconds: input.durationSeconds + 15, ttlSecondsAfterFinished: 600,
    template: { metadata: { labels }, spec: {
      restartPolicy: 'Never', automountServiceAccountToken: false, terminationGracePeriodSeconds: 2, activeDeadlineSeconds: input.durationSeconds + 15,
      securityContext: { runAsNonRoot: true, runAsUser: 1000, seccompProfile: { type: 'RuntimeDefault' } },
      containers: [{ name: 'frontend-traffic', image: GENERATOR_IMAGE, imagePullPolicy: 'IfNotPresent', command: ['node', '-e', GENERATOR_SOURCE],
        env: [{ name: 'FRONTEND_TARGET', value: config.target }, { name: 'DURATION_SECONDS', value: String(input.durationSeconds) }, { name: 'CONCURRENCY', value: String(input.concurrency) }],
        resources: { requests: { cpu: '50m', memory: '32Mi' }, limits: { cpu: '250m', memory: '96Mi' } },
        securityContext: { allowPrivilegeEscalation: false, readOnlyRootFilesystem: true, capabilities: { drop: ['ALL'] } },
      }],
    } },
  } }
}
export function ownedJob(job, config) {
  return job?.metadata?.name === JOB_NAME && job.metadata.namespace === config.namespace && job.metadata.labels?.[FEATURE_LABEL] === FEATURE && UUID.test(job.metadata.labels?.[EXPERIMENT_LABEL] ?? '') && job.metadata.annotations?.[`${ANNOTATION}target`] === config.target && Boolean(job.metadata.uid)
}
function ownedPod(pod, job) {
  return pod.metadata?.labels?.[FEATURE_LABEL] === FEATURE && UUID.test(pod.metadata.labels?.[EXPERIMENT_LABEL] ?? '') && pod.metadata.ownerReferences?.some(ref => ref.kind === 'Job' && ref.name === JOB_NAME && ref.controller === true && (!job || (ref.uid === job.metadata.uid && pod.metadata.labels[EXPERIMENT_LABEL] === job.metadata.labels[EXPERIMENT_LABEL])))
}
const code = error => Number(error?.code ?? error?.statusCode)
const time = value => value ? new Date(value).toISOString() : null

export function createExperimentController(api, config, clock = () => new Date()) {
  let last = null, tail = Promise.resolve()
  // Serializes this process. The fixed Kubernetes Job name is the cross-process lock.
  const locked = fn => { const result = tail.then(fn); tail = result.catch(() => {}); return result }
  async function discover() {
    const [jobResult, podsResult] = await Promise.allSettled([api.readJob(), api.listPods()])
    if (jobResult.status === 'rejected' && code(jobResult.reason) !== 404) throw jobResult.reason
    if (podsResult.status === 'rejected') throw podsResult.reason
    const job = jobResult.status === 'fulfilled' ? jobResult.value : null
    if (job && !ownedJob(job, config)) throw new ControlError(409, 'OWNERSHIP_CONFLICT', 'The reserved Job name belongs to an unrecognized resource; no mutation is allowed.')
    const listed = podsResult.value
    if (listed.metadata?.continue) throw new ControlError(503, 'INCOMPLETE_DISCOVERY', 'Generator pod discovery was truncated; controls are blocked.')
    const allPods = listed.items ?? []
    // Any unrecognized pod with our feature label blocks new traffic rather than being deleted.
    if (allPods.some(p => !ownedPod(p, job))) throw new ControlError(409, 'OWNERSHIP_CONFLICT', 'Unrecognized generator pods require operator review.')
    const live = allPods.filter(p => p.metadata?.deletionTimestamp || !['Succeeded', 'Failed'].includes(p.status?.phase))
    if (!job) {
      if (live.length) return { job: null, experiment: { id: live[0].metadata.labels[EXPERIMENT_LABEL], state: 'cleanup-pending', requestedAt: null, startedAt: null, endedAt: null, stopRequestedAt: null, durationSeconds: null, concurrency: null, cleanup: { status: 'pending', message: 'Waiting for Kubernetes to remove orphaned generator pods; their pod deadline still applies.' }, generatorPods: live.map(p => ({ name: p.metadata.name, phase: p.status?.phase ?? 'Unknown', terminating: Boolean(p.metadata.deletionTimestamp) })) } }
      if (last && !terminal.has(last.state)) last = { ...last, state: last.stopRequestedAt ? 'stopped' : 'finished', endedAt: clock().toISOString(), cleanup: { status: 'complete', message: null }, generatorPods: [] }
      if (last && terminal.has(last.state)) last = { ...last, cleanup: { status: 'complete', message: null }, generatorPods: [] }
      return { job: null, experiment: last }
    }
    const a = job.metadata.annotations ?? {}
    const stopped = a[`${ANNOTATION}stop-requested-at`] ?? null
    const conditions = job.status?.conditions ?? []
    const completed = conditions.find(c => c.type === 'Complete' && c.status === 'True')
    const failed = conditions.find(c => c.type === 'Failed' && c.status === 'True')
    const state = job.metadata.deletionTimestamp || stopped ? 'stopping' : completed ? 'completed' : failed ? 'failed' : live.some(p => p.status?.phase === 'Running') ? 'running' : 'pending'
    const experiment = {
      id: job.metadata.labels[EXPERIMENT_LABEL], state, requestedAt: a[`${ANNOTATION}requested-at`] ?? time(job.metadata.creationTimestamp), startedAt: time(job.status?.startTime), endedAt: time(job.status?.completionTime ?? completed?.lastTransitionTime ?? failed?.lastTransitionTime), stopRequestedAt: stopped,
      durationSeconds: Number(a[`${ANNOTATION}duration`]) || null, concurrency: Number(a[`${ANNOTATION}concurrency`]) || null, deadlineSeconds: job.spec?.activeDeadlineSeconds ?? null,
      cleanup: { status: job.metadata.deletionTimestamp || stopped ? 'pending' : completed || failed ? live.length ? 'pending' : 'retained' : 'not-requested', message: completed || failed ? 'Finished Job metadata retained for up to 10 minutes by Kubernetes TTL cleanup.' : null },
      generatorPods: allPods.map(p => ({ name: p.metadata.name, phase: p.status?.phase ?? 'Unknown', terminating: Boolean(p.metadata.deletionTimestamp) })),
    }
    if (last?.id === experiment.id && last.cleanup?.status === 'failed') experiment.cleanup = last.cleanup
    last = experiment
    return { job, experiment }
  }
  const response = experiment => ({ observedAt: clock().toISOString(), source: { type: 'kubernetes', namespace: config.namespace, service: config.service }, availability: 'available', data: { enabled: true, bounds: BOUNDS, target: config.target, experiment }, error: null })
  async function status() { const result = response((await discover()).experiment); if (result.data.experiment?.cleanup.status === 'failed') { result.availability = 'partial'; result.error = { code: 'CLEANUP_FAILED', message: result.data.experiment.cleanup.message } } return result }
  async function start(body) {
    const input = validateInput(body)
    return locked(async () => {
      const current = await discover()
      if (current.experiment?.id === input.experimentId) {
        if (current.experiment.durationSeconds !== input.durationSeconds || current.experiment.concurrency !== input.concurrency) throw new ControlError(409, 'ID_REUSED', 'This experiment ID already has different controls.')
        return response(current.experiment)
      }
      if (current.job || current.experiment && !terminal.has(current.experiment.state) && current.experiment.state !== 'finished') {
        // Terminal resources must be explicitly stopped/cleaned before a new experiment.
        throw new ControlError(409, 'EXPERIMENT_EXISTS', 'An experiment or its retained Job already exists. Stop/clean it before starting another.')
      }
      try { await api.createJob(buildJob(config, input, clock().toISOString())) } catch (error) {
        // A concurrent controller or an ambiguous create response is reconciled by name/ID.
        const found = await discover()
        if (found.experiment?.id === input.experimentId) {
          if (found.experiment.durationSeconds !== input.durationSeconds || found.experiment.concurrency !== input.concurrency) throw new ControlError(409, 'ID_REUSED', 'This experiment ID already has different controls.')
          return response(found.experiment)
        }
        if (code(error) === 409 || found.job) throw new ControlError(409, 'EXPERIMENT_EXISTS', 'Another experiment owns the active Job.')
        throw error
      }
      return status()
    })
  }
  async function stop(body) {
    const { experimentId } = validateInput(body, true)
    return locked(async () => {
      const current = await discover()
      if (!current.job) return response(current.experiment)
      if (current.experiment.id !== experimentId) throw new ControlError(409, 'EXPERIMENT_CHANGED', 'The active experiment has changed; refresh before stopping.')
      const job = current.job
      try {
        if (!job.metadata.deletionTimestamp) {
          if (last?.id === current.experiment.id) last = { ...last, cleanup: { status: 'pending', message: null } }
          // UID/resourceVersion tests prevent patching a replacement resource after a race.
          await api.suspendJob(job, current.experiment.stopRequestedAt || clock().toISOString())
          await api.deleteJob(job.metadata.uid)
        }
      } catch (error) {
        if (code(error) !== 404) {
          last = { ...current.experiment, state: 'cleanup-pending', cleanup: { status: 'failed', message: 'Stop/cleanup could not be confirmed. Retry Stop; the Kubernetes deadline remains enforced.' } }
          return { ...response(last), availability: 'partial', error: { code: 'CLEANUP_FAILED', message: last.cleanup.message } }
        }
      }
      last = { ...current.experiment, state: 'stopping', stopRequestedAt: current.experiment.stopRequestedAt || clock().toISOString(), cleanup: { status: 'pending', message: null } }
      return status()
    })
  }
  return { status, start, stop }
}
