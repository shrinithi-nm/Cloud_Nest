import * as k8s from '@kubernetes/client-node'
import { JOB_NAME, SELECTOR } from './experiments.js'

export function createControlApi(config, providedKubeConfig) {
  const kc = providedKubeConfig ?? new k8s.KubeConfig()
  if (!providedKubeConfig) {
    if (config.inCluster) kc.loadFromCluster()
    else { kc.loadFromDefault(); if (config.context) kc.setCurrentContext(config.context) }
  }
  const transport = new k8s.IsomorphicFetchHttpLibrary()
  const options = { httpApi: { send(request) { request.setSignal(AbortSignal.timeout(3500)); return transport.send(request) } } }
  const batch = kc.makeApiClient(k8s.BatchV1Api)
  const core = kc.makeApiClient(k8s.CoreV1Api)
  const namespace = config.namespace
  return {
    readJob: () => batch.readNamespacedJob({ namespace, name: JOB_NAME }, options),
    createJob: body => batch.createNamespacedJob({ namespace, body }, options),
    listPods: () => core.listNamespacedPod({ namespace, labelSelector: SELECTOR, limit: 100, timeoutSeconds: 3 }, options),
    suspendJob: (job, timestamp) => batch.patchNamespacedJob({ namespace, name: JOB_NAME, body: [
      { op: 'test', path: '/metadata/uid', value: job.metadata.uid },
      { op: 'test', path: '/metadata/resourceVersion', value: job.metadata.resourceVersion },
      { op: 'add', path: '/metadata/annotations/cloudnest.io~1stop-requested-at', value: timestamp },
      { op: 'add', path: '/spec/suspend', value: true },
    ] }, k8s.setHeaderOptions('Content-Type', k8s.PatchStrategy.JsonPatch, options)),
    deleteJob: uid => batch.deleteNamespacedJob({ namespace, name: JOB_NAME, body: { propagationPolicy: 'Foreground', gracePeriodSeconds: 0, preconditions: { uid } } }, options),
  }
}
