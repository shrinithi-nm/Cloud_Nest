import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock3,
  TrendingDown,
  TrendingUp
} from 'lucide-react'
import { getStudentById } from '../../services/adminData'

function StudentDetail() {
  const navigate = useNavigate()
  const { studentId } = useParams()
  const student = getStudentById(studentId)

  if (!student) {
    return (
      <div className="student-not-found">
        <h1>Student not found</h1>
        <button onClick={() => navigate('/admin/students')}>
          Return to Student Fleet
        </button>
      </div>
    )
  }

  const subjectPerformance = [
    {
      subject: 'Database Systems',
      score: Math.max(student.average - 9, 0)
    },
    {
      subject: 'Operating Systems',
      score: Math.max(student.average - 3, 0)
    },
    {
      subject: 'Cloud Computing',
      score: Math.min(student.average + 7, 100)
    },
    {
      subject: 'Computer Networks',
      score: Math.min(student.average + 2, 100)
    }
  ]

  return (
    <div>
      <button
        type="button"
        className="student-back-button"
        onClick={() => navigate('/admin/students')}
      >
        <ArrowLeft size={17} />
        Student Fleet
      </button>

      <section className="student-detail-header">
        <div className="student-detail-avatar">
          {student.name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .slice(0, 2)}
        </div>

        <div>
          <p className="control-eyebrow">STUDENT PROFILE</p>
          <h1>{student.name}</h1>
          <p>
            {student.id} · {student.email}
          </p>
        </div>

        <span
          className={`fleet-badge risk-${student.risk.toLowerCase()}`}
        >
          {student.risk} risk
        </span>
      </section>

      <section className="student-detail-metrics">
        <article>
          <BookOpen size={20} />
          <span>Academic average</span>
          <strong>{student.average}%</strong>
        </article>

        <article>
          {student.growth >= 0 ? (
            <TrendingUp size={20} />
          ) : (
            <TrendingDown size={20} />
          )}
          <span>Performance growth</span>
          <strong>
            {student.growth > 0 ? '+' : ''}
            {student.growth}%
          </strong>
        </article>

        <article>
          <CheckCircle2 size={20} />
          <span>Task completion</span>
          <strong>{student.completion}%</strong>
        </article>

        <article>
          <Clock3 size={20} />
          <span>Workload</span>
          <strong>{student.workload}</strong>
        </article>
      </section>

      <section className="student-detail-grid">
        <article className="student-detail-panel">
          <div className="command-panel-heading">
            <div>
              <p className="control-eyebrow">ACADEMIC HEALTH</p>
              <h2>Subject performance</h2>
            </div>
            <BookOpen size={20} />
          </div>

          <div className="subject-performance-list">
            {subjectPerformance.map((item) => (
              <div key={item.subject}>
                <div>
                  <span>{item.subject}</span>
                  <strong>{item.score}%</strong>
                </div>

                <div className="student-progress-track">
                  <span style={{ width: `${item.score}%` }}></span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="student-detail-panel">
          <div className="command-panel-heading">
            <div>
              <p className="control-eyebrow">INTELLIGENCE</p>
              <h2>Academic signals</h2>
            </div>
            <AlertTriangle size={20} />
          </div>

          <div className="student-signal-list">
            {student.risk === 'High' && (
              <div className="student-signal warning">
                <AlertTriangle size={17} />
                <span>
                  <strong>Academic intervention recommended</strong>
                  <small>
                    Performance and completion indicators require attention.
                  </small>
                </span>
              </div>
            )}

            {student.growth < 0 && (
              <div className="student-signal warning">
                <TrendingDown size={17} />
                <span>
                  <strong>Performance declining</strong>
                  <small>
                    Current growth is {student.growth}% compared with the
                    previous period.
                  </small>
                </span>
              </div>
            )}

            {student.workload === 'Overloaded' && (
              <div className="student-signal warning">
                <Clock3 size={17} />
                <span>
                  <strong>Workload collision detected</strong>
                  <small>
                    Multiple academic commitments are concentrated together.
                  </small>
                </span>
              </div>
            )}

            {student.risk === 'Low' && (
              <div className="student-signal healthy">
                <CheckCircle2 size={17} />
                <span>
                  <strong>Academic health stable</strong>
                  <small>
                    Performance and completion indicators are healthy.
                  </small>
                </span>
              </div>
            )}
          </div>
        </article>
      </section>
    </div>
  )
}

export default StudentDetail