import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import {
  Activity,
  Server,
  Boxes,
  Network,
  Cpu,
  MemoryStick,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Cloud
} from 'lucide-react'
import api from '../services/api'

function CloudPulse() {
  const [backend, setBackend] = useState({
    status: 'checking',
    service: 'CloudNest Backend'
  })
  const [lastChecked, setLastChecked] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const checkBackend = async () => {
    setRefreshing(true)

    try {
      const response = await api.get('/api/health')

      setBackend({
        status: response.data.status === 'ok' ? 'online' : 'degraded',
        service: response.data.service || 'CloudNest Backend'
      })
    } catch {
      setBackend({
        status: 'offline',
        service: 'CloudNest Backend'
      })
    } finally {
      setLastChecked(new Date())
      setRefreshing(false)
    }
  }

  useEffect(() => {
  let active = true

  const loadBackendHealth = async () => {
    try {
      const response = await api.get('/api/health')

      if (active) {
        setBackend({
          status: response.data.status === 'ok' ? 'online' : 'degraded',
          service: response.data.service || 'CloudNest Backend'
        })
      }
    } catch {
      if (active) {
        setBackend({
          status: 'offline',
          service: 'CloudNest Backend'
        })
      }
    } finally {
      if (active) {
        setLastChecked(new Date())
      }
    }
  }

  loadBackendHealth()

  return () => {
    active = false
  }
}, [])

  const backendOnline = backend.status === 'online'

  return (
    <div className="cloud-pulse-page">
      <section className="page-header cloud-pulse-header">
        <div>
          <p className="page-eyebrow">Infrastructure Intelligence</p>
          <h1 className="page-title">Cloud Pulse</h1>
          <p className="page-description">
            Monitor CloudNest services, deployment health and cloud runtime
            from one workspace.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button pulse-refresh"
          onClick={checkBackend}
          disabled={refreshing}
        >
          <RefreshCw
            size={17}
            className={refreshing ? 'refresh-spinning' : ''}
          />
          Refresh
        </button>
      </section>

      <section className="pulse-overview">
        <motion.article
          className="pulse-hero-card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="pulse-orb">
            <Activity size={30} />
          </div>

          <div>
            <p className="section-kicker">SYSTEM PULSE</p>
            <h2>
              {backendOnline
                ? 'CloudNest backend is online'
                : backend.status === 'checking'
                  ? 'Checking CloudNest services'
                  : 'Backend connection unavailable'}
            </h2>

            <p>
              Live health checks are separated from Kubernetes infrastructure
              monitoring for clearer service visibility.
            </p>
          </div>

          <div
            className={`pulse-status ${
              backendOnline ? 'pulse-online' : 'pulse-offline'
            }`}
          >
            {backendOnline ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertCircle size={18} />
            )}

            {backend.status}
          </div>
        </motion.article>
      </section>

      <section className="pulse-grid">
        <motion.article
          className="pulse-card card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="pulse-card-icon">
            <Server size={21} />
          </div>

          <p>Backend Service</p>
          <h3>{backend.service}</h3>

          <span className={backendOnline ? 'status-good' : 'status-warning'}>
            {backendOnline ? 'Healthy' : 'Unavailable'}
          </span>
        </motion.article>

        <motion.article
          className="pulse-card card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="pulse-card-icon">
            <Boxes size={21} />
          </div>

          <p>Frontend Deployment</p>
          <h3>Kubernetes</h3>
          <span className="status-neutral">Cluster managed</span>
        </motion.article>

        <motion.article
          className="pulse-card card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="pulse-card-icon">
            <Network size={21} />
          </div>

          <p>Service Discovery</p>
          <h3>Internal Service</h3>
          <span className="status-neutral">Configured</span>
        </motion.article>

        <motion.article
          className="pulse-card card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="pulse-card-icon">
            <Cloud size={21} />
          </div>

          <p>Runtime Mode</p>
          <h3>Containerized</h3>
          <span className="status-neutral">Docker + Kubernetes</span>
        </motion.article>
      </section>

      <section className="pulse-runtime card">
        <div className="section-heading">
          <div>
            <p className="section-kicker">KUBERNETES RUNTIME</p>
            <h2>Infrastructure configuration</h2>
          </div>

          <Boxes size={22} />
        </div>

        <div className="runtime-grid">
          <div className="runtime-item">
            <Server size={19} />
            <div>
              <span>Frontend replicas</span>
              <strong>2 desired</strong>
            </div>
          </div>

          <div className="runtime-item">
            <Activity size={19} />
            <div>
              <span>Health probes</span>
              <strong>Enabled</strong>
            </div>
          </div>

          <div className="runtime-item">
            <Cpu size={19} />
            <div>
              <span>CPU limit</span>
              <strong>200m / Pod</strong>
            </div>
          </div>

          <div className="runtime-item">
            <MemoryStick size={19} />
            <div>
              <span>Memory limit</span>
              <strong>128Mi / Pod</strong>
            </div>
          </div>
        </div>

        <div className="runtime-note">
          <Activity size={18} />

          <p>
            Live pod, CPU and memory metrics will appear here when the
            Kubernetes metrics API is connected.
          </p>
        </div>
      </section>

      <section className="pulse-footer">
        <span>
          {lastChecked
            ? `Backend checked at ${lastChecked.toLocaleTimeString()}`
            : 'Waiting for first health check'}
        </span>
      </section>
    </div>
  )
}

export default CloudPulse