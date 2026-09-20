import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Users
} from 'lucide-react'
import {
  getCohortAnalytics,
  getRiskStudents
} from '../../services/analyticsService'

function RiskAdmin() {
  const navigate = useNavigate()
  const students = getRiskStudents()
  const cohort = getCohortAnalytics()

  return (
    <div>
      <section className="control-page-header">
        <div>
          <p className="control-eyebrow">
            ACADEMIC INTELLIGENCE
          </p>

          <h1>At-Risk Students</h1>

          <p>
            Identify students showing academic decline, low completion
            or workload pressure.
          </p>
        </div>
      </section>

      <section className="fleet-summary">
        <div>
          <ShieldAlert size={19} />
          <span>High risk</span>
          <strong>{cohort.highRisk}</strong>
        </div>

        <div>
          <AlertTriangle size={19} />
          <span>Medium risk</span>
          <strong>{cohort.mediumRisk}</strong>
        </div>

        <div>
          <Users size={19} />
          <span>Students monitored</span>
          <strong>{students.length}</strong>
        </div>
      </section>

      <section className="risk-grid">
        {students.map((student) => (
          <article className="risk-student-card" key={student.id}>
            <div className="risk-card-header">
              <div>
                <span>{student.id}</span>
                <h2>{student.name}</h2>
                <p>{student.email}</p>
              </div>

              <span
                className={`fleet-badge risk-${student.risk.toLowerCase()}`}
              >
                {student.risk} Risk
              </span>
            </div>

            <div className="risk-metrics">
              <div>
                <span>Average</span>
                <strong>{student.average}%</strong>
              </div>

              <div>
                <span>Growth</span>
                <strong>
                  {student.growth > 0 ? '+' : ''}
                  {student.growth}%
                </strong>
              </div>

              <div>
                <span>Completion</span>
                <strong>{student.completion}%</strong>
              </div>
            </div>

            <div className="risk-reasons">
              <span>Detected signals</span>

              {student.reasons.length === 0 ? (
                <p>Requires continued monitoring.</p>
              ) : (
                student.reasons.map((reason) => (
                  <p key={reason}>
                    <AlertTriangle size={13} />
                    {reason}
                  </p>
                ))
              )}
            </div>

            <button
              type="button"
              className="control-action-button"
              onClick={() =>
                navigate(`/admin/students/${student.id}`)
              }
            >
              Open student profile
              <ArrowRight size={15} />
            </button>
          </article>
        ))}
      </section>
    </div>
  )
}

export default RiskAdmin