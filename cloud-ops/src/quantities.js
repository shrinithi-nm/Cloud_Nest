// Kubernetes quantities: decimal SI, binary SI, and decimal exponents.
export function quantity(value) {
  if (value === undefined || value === null) return null
  const match = String(value).match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))([eE][+-]?\d+|[numkKMGTPE]|[KMGTPE]i)?$/)
  if (!match) return null
  const suffix = match[2] || ''
  const factors = { n: 1e-9, u: 1e-6, m: 1e-3, k: 1e3, K: 1e3, M: 1e6, G: 1e9, T: 1e12, P: 1e15, E: 1e18 }
  const factor = suffix.endsWith('i') ? 1024 ** ('KMGTPE'.indexOf(suffix[0]) + 1)
    : /^[eE][+-]?\d+$/.test(suffix) ? 10 ** Number(suffix.slice(1)) : (factors[suffix] ?? 1)
  const result = Number(match[1]) * factor
  return Number.isFinite(result) && result >= 0 ? result : null
}
export function podUsage(metric) {
  const containers = metric?.containers
  const sum = key => {
    if (!containers?.length) return null
    const values = containers.map(c => quantity(c.usage?.[key]))
    return values.some(v => v === null) ? null : values.reduce((a, b) => a + b, 0)
  }
  const cpu = sum('cpu')
  return { cpuMillicores: cpu === null ? null : cpu * 1000, memoryBytes: sum('memory'), timestamp: metric?.timestamp ?? null, window: metric?.window ?? null }
}
