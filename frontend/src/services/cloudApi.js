export async function getCloudSnapshot(signal) {
  const response = await fetch('/api/cloud/snapshot', { signal, credentials: 'same-origin', cache: 'no-store' })
  if (!response.ok) throw new Error('Monitoring connection unavailable')
  const data = await response.json()
  if (!data.sections || !data.observedAt) throw new Error('Invalid monitoring response')
  return data
}

export async function cloudExperiment(action = '', body, signal) {
  const response = await fetch(`/api/cloud/experiment${action ? `/${action}` : ''}`, {
    method: body ? 'POST' : 'GET', signal, credentials: 'same-origin', cache: 'no-store',
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  })
  let result
  try { result = await response.json() } catch { throw new Error('Controller connection unavailable') }
  if (!response.ok && result.error?.code !== 'CONTROLS_DISABLED') throw new Error(result.error?.message || 'Controller connection unavailable')
  if (!result.data || !result.observedAt) throw new Error('Invalid controller response')
  return result
}

export async function getObservability(signal) {
  const response = await fetch('/api/cloud/observability', { signal, credentials: 'same-origin', cache: 'no-store' })
  if (!response.ok) throw new Error('Observability connection unavailable')
  const result = await response.json()
  if (!result.observedAt || !result.data?.alerts || !Array.isArray(result.data.targets)) throw new Error('Invalid observability response')
  return result
}
