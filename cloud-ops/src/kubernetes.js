import * as k8s from '@kubernetes/client-node'

export function createReaders(config) {
  const kc = new k8s.KubeConfig()
  if (config.inCluster) kc.loadFromCluster()
  else {
    kc.loadFromDefault()
    if (process.env.KUBE_CONTEXT) kc.setCurrentContext(process.env.KUBE_CONTEXT)
  }
  const transport = new k8s.IsomorphicFetchHttpLibrary()
  const options = { httpApi: { send(request) {
    // Real abort, including body consumption; never a Promise.race-only timeout.
    request.setSignal(AbortSignal.timeout(3500))
    return transport.send(request)
  } } }
  const core = kc.makeApiClient(k8s.CoreV1Api)
  const apps = kc.makeApiClient(k8s.AppsV1Api)
  const autoscaling = kc.makeApiClient(k8s.AutoscalingV2Api)
  const custom = kc.makeApiClient(k8s.CustomObjectsApi)
  const namespace = config.namespace
  return {
    deployment: () => apps.readNamespacedDeployment({ namespace, name: config.deployment }, options),
    pods: () => core.listNamespacedPod({ namespace, labelSelector: config.selector, limit: 200, timeoutSeconds: 3 }, options),
    metrics: () => custom.listNamespacedCustomObject({ group: 'metrics.k8s.io', version: 'v1beta1', namespace, plural: 'pods', labelSelector: config.selector, limit: 200, timeoutSeconds: 3 }, options),
    hpa: () => autoscaling.readNamespacedHorizontalPodAutoscaler({ namespace, name: config.hpa }, options),
    events: () => core.listNamespacedEvent({ namespace, limit: 200, timeoutSeconds: 3 }, options),
  }
}
