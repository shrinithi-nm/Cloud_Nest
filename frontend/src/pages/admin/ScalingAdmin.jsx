import {
  Activity,
  ArrowDown,
  ArrowUp,
  Boxes,
  Cpu,
  Gauge,
  Server,
  Zap
} from 'lucide-react'
import { motion } from 'motion/react'

const scalingEvents = [
  {
    title: 'Baseline capacity',
    detail: 'Frontend maintains a minimum of 2 replicas during normal traffic.',
    icon: Server
  },
  {
    title: 'Traffic detected',
    detail: 'Metrics Server supplies CPU utilization to the Horizontal Pod Autoscaler.',
    icon: Activity
  },
  {
    title: 'Automatic scale-up verified',
    detail: 'CloudNest scaled from 2 to 4 frontend replicas during the load test.',
    icon: ArrowUp
  },
  {
    title: 'Automatic scale-down verified',
    detail: 'Replicas return toward the minimum after traffic pressure is removed.',
    icon: ArrowDown
  }
]

function ScalingAdmin() {
  return (
    <div className="scaling-admin">
      <div className="control-page-header">
        <div>
          <p className="control-eyebrow">Cloud Operations</p>
          <h1>Autoscaling</h1>
          <p>
            Kubernetes capacity policy for the CloudNest frontend workload.
          </p>
        </div>

        <div className="command-status">
          <span className="command-status-dot" />
          HPA Enabled
        </div>
      </div>

      <div className="command-metrics">
        <motion.div
          className="command-metric-card"
          whileHover={{ y: -4 }}
        >
          <div className="command-metric-icon">
            <Boxes size={20} />
          </div>
          <span>Minimum Replicas</span>
          <strong>2</strong>
          <small>Baseline availability</small>
        </motion.div>

        <motion.div
          className="command-metric-card"
          whileHover={{ y: -4 }}
        >
          <div className="command-metric-icon">
            <Server size={20} />
          </div>
          <span>Maximum Replicas</span>
          <strong>6</strong>
          <small>Automatic capacity ceiling</small>
        </motion.div>

        <motion.div
          className="command-metric-card"
          whileHover={{ y: -4 }}
        >
          <div className="command-metric-icon">
            <Cpu size={20} />
          </div>
          <span>CPU Target</span>
          <strong>50%</strong>
          <small>Average utilization target</small>
        </motion.div>

        <motion.div
          className="command-metric-card"
          whileHover={{ y: -4 }}
        >
          <div className="command-metric-icon">
            <Zap size={20} />
          </div>
          <span>Verified Scale-Up</span>
          <strong>2 → 4</strong>
          <small>Observed during load test</small>
        </motion.div>
      </div>

      <div className="scaling-control-grid">
        <section className="command-panel">
          <div className="command-panel-heading">
            <div>
              <p className="control-eyebrow">Scaling Policy</p>
              <h2>Horizontal Pod Autoscaler</h2>
            </div>
            <Gauge size={22} />
          </div>

          <div className="scaling-policy">
            <div className="scaling-policy-row">
              <span>Target workload</span>
              <strong>cloudnest-frontend</strong>
            </div>

            <div className="scaling-policy-row">
              <span>Metric source</span>
              <strong>Metrics Server</strong>
            </div>

            <div className="scaling-policy-row">
              <span>Resource metric</span>
              <strong>CPU utilization</strong>
            </div>

            <div className="scaling-policy-row">
              <span>Target utilization</span>
              <strong>50%</strong>
            </div>

            <div className="scaling-policy-row">
              <span>Replica range</span>
              <strong>2 – 6 pods</strong>
            </div>

            <div className="scaling-policy-row">
              <span>Scale-down stabilization</span>
              <strong>60 seconds</strong>
            </div>
          </div>
        </section>

        <section className="command-panel">
          <div className="command-panel-heading">
            <div>
              <p className="control-eyebrow">Architecture</p>
              <h2>Autoscaling Pipeline</h2>
            </div>
            <Activity size={22} />
          </div>

          <div className="scaling-pipeline">
            <div>Frontend Pods</div>
            <span>→</span>
            <div>Metrics Server</div>
            <span>→</span>
            <div>HPA</div>
            <span>→</span>
            <div>Deployment</div>
          </div>

          <p className="scaling-note">
            Metrics Server observes resource usage. HPA evaluates CPU
            utilization and adjusts the desired replica count of the
            frontend Deployment.
          </p>
        </section>
      </div>

      <section className="command-panel scaling-events-panel">
        <div className="command-panel-heading">
          <div>
            <p className="control-eyebrow">Verification</p>
            <h2>Autoscaling Test</h2>
          </div>
        </div>

        <div className="scaling-event-grid">
          {scalingEvents.map((event) => {
            const Icon = event.icon

            return (
              <div
                className="scaling-event"
                key={event.title}
              >
                <div className="scaling-event-icon">
                  <Icon size={19} />
                </div>

                <div>
                  <strong>{event.title}</strong>
                  <p>{event.detail}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <div className="scaling-disclaimer">
        This page displays the deployed CloudNest autoscaling policy and
        verified load-test behavior. Live Kubernetes metrics remain
        available through the cluster and are not exposed directly to the
        browser.
      </div>
    </div>
  )
}

export default ScalingAdmin