import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  Cloud,
  FileText,
  Server,
  TrendingUp,
  Users
} from 'lucide-react'
import { getAdminSummary } from '../../services/adminData'

function CommandCenter() {
  const navigate = useNavigate()
  const summary = getAdminSummary()

  const metrics = [
    {
      label: 'Students',
      value: summary.studentCount,
      detail: `${summary.improving} currently improving`,
      icon: Users
    },
    {
      label: 'Subjects',
      value: summary.subjectCount,
      detail: 'Current academic network',
      icon: BookOpen
    },
    {
      label: 'Assignments',
      value: summary.assignmentCount,
      detail: `${summary.awaitingGrading} submissions await grading`,
      icon: ClipboardCheck
    },
    {
      label: 'Upcoming Exams',
      value: summary.examCount,
      detail: 'Published assessments',
      icon: FileText
    }
  ]

  return (
    <div className="command-center">
      <section className="control-page-header">
        <div>
          <p className="control-eyebrow">PLATFORM OVERVIEW</p>
          <h1>Command Center</h1>
          <p>
            Monitor academic operations, student performance and CloudNest
            infrastructure from one control plane.
          </p>
        </div>

        <div className="command-status">
          <span></span>
          Platform operational
        </div>
      </section>

      <section className="command-metrics">
        {metrics.map((metric, index) => {
          const Icon = metric.icon

          return (
            <motion.article
              className="command-metric-card"
              key={metric.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
            >
              <div className="command-metric-top">
                <div className="command-metric-icon">
                  <Icon size={20} />
                </div>
                <TrendingUp size={17} />
              </div>

              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <p>{metric.detail}</p>
            </motion.article>
          )
        })}
      </section>

      <section className="command-grid">
        <article className="command-panel">
          <div className="command-panel-heading">
            <div>
              <p className="control-eyebrow">ACADEMIC INTELLIGENCE</p>
              <h2>Cohort health</h2>
            </div>
            <Activity size={21} />
          </div>

          <div className="command-score">
            <div>
              <strong>{summary.average}%</strong>
              <span>Average student performance</span>
            </div>

            <div className="command-growth">
              <TrendingUp size={17} />
              {summary.improving} improving
            </div>
          </div>

          <div className="command-health-grid">
            <div>
              <strong>{summary.improving}</strong>
              <span>Improving</span>
            </div>

            <div>
              <strong>{summary.atRisk}</strong>
              <span>High risk</span>
            </div>

            <div>
              <strong>{summary.overloaded}</strong>
              <span>Overloaded</span>
            </div>
          </div>

          <button
            type="button"
            className="control-action-button"
            onClick={() => navigate('/admin/students')}
          >
            Explore student fleet
            <ArrowRight size={17} />
          </button>
        </article>

        <article className="command-panel">
          <div className="command-panel-heading">
            <div>
              <p className="control-eyebrow">ATTENTION REQUIRED</p>
              <h2>Operations queue</h2>
            </div>
            <AlertTriangle size={21} />
          </div>

          <div className="command-queue">
            <div>
              <span className="queue-warning">
                <AlertTriangle size={16} />
              </span>
              <div>
                <strong>{summary.atRisk} high-risk students</strong>
                <p>Require academic intervention.</p>
              </div>
            </div>

            <div>
              <span className="queue-warning">
                <ClipboardCheck size={16} />
              </span>
              <div>
                <strong>
                  {summary.awaitingGrading} submissions waiting
                </strong>
                <p>Pending assessment and feedback.</p>
              </div>
            </div>

            <div>
              <span className="queue-warning">
                <Activity size={16} />
              </span>
              <div>
                <strong>{summary.overloaded} overloaded students</strong>
                <p>Deadline collisions detected.</p>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="command-grid">
        <article className="command-panel">
          <div className="command-panel-heading">
            <div>
              <p className="control-eyebrow">CLOUD OPERATIONS</p>
              <h2>Runtime overview</h2>
            </div>
            <Cloud size={21} />
          </div>

          <div className="runtime-grid">
            <div>
              <Server size={19} />
              <span>Frontend replicas</span>
              <strong>2 / 2</strong>
            </div>

            <div>
              <Activity size={19} />
              <span>Health probes</span>
              <strong>Operational</strong>
            </div>

            <div>
              <Cloud size={19} />
              <span>Kubernetes</span>
              <strong>Connected</strong>
            </div>

            <div>
              <Server size={19} />
              <span>Backend</span>
              <strong>Integration pending</strong>
            </div>
          </div>

          <button
            type="button"
            className="control-action-button"
            onClick={() => navigate('/admin/cloud')}
          >
            Open infrastructure
            <ArrowRight size={17} />
          </button>
        </article>

        <article className="command-panel">
          <div className="command-panel-heading">
            <div>
              <p className="control-eyebrow">QUICK OPERATIONS</p>
              <h2>Manage CloudNest</h2>
            </div>
          </div>

          <div className="command-actions">
            <button onClick={() => navigate('/admin/students')}>
              <Users size={18} />
              <span>
                <strong>Student Fleet</strong>
                <small>Inspect student academic health</small>
              </span>
              <ArrowRight size={16} />
            </button>

            <button onClick={() => navigate('/admin/assignments')}>
              <ClipboardCheck size={18} />
              <span>
                <strong>Assignment Center</strong>
                <small>Assign and track coursework</small>
              </span>
              <ArrowRight size={16} />
            </button>

            <button onClick={() => navigate('/admin/exams')}>
              <FileText size={18} />
              <span>
                <strong>Exam Control</strong>
                <small>Publish and manage assessments</small>
              </span>
              <ArrowRight size={16} />
            </button>
          </div>
        </article>
      </section>
    </div>
  )
}

export default CommandCenter