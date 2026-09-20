import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Users
} from 'lucide-react'
import { getAssignments } from '../../services/adminData'

function AssignmentDetail() {
  const navigate = useNavigate()
  const { assignmentId } = useParams()

  const assignment = getAssignments().find(
    (item) => item.id === assignmentId
  )

  if (!assignment) {
    return (
      <div className="student-not-found">
        <h1>Assignment not found</h1>
        <button onClick={() => navigate('/admin/assignments')}>
          Return to Assignment Center
        </button>
      </div>
    )
  }

  const pending = Math.max(
    assignment.assigned - assignment.submitted,
    0
  )

  const awaitingGrading = Math.max(
    assignment.submitted - assignment.graded,
    0
  )

  return (
    <div>
      <button
        type="button"
        className="student-back-button"
        onClick={() => navigate('/admin/assignments')}
      >
        <ArrowLeft size={17} />
        Assignment Center
      </button>

      <section className="control-page-header">
        <div>
          <p className="control-eyebrow">{assignment.subject}</p>
          <h1>{assignment.title}</h1>
          <p>
            Monitor assignment distribution, submission and grading
            progress.
          </p>
        </div>

        <span className="fleet-badge risk-low">
          {assignment.status}
        </span>
      </section>

      <section className="student-detail-metrics">
        <article>
          <Users size={20} />
          <span>Assigned</span>
          <strong>{assignment.assigned}</strong>
        </article>

        <article>
          <CheckCircle2 size={20} />
          <span>Submitted</span>
          <strong>{assignment.submitted}</strong>
        </article>

        <article>
          <Clock3 size={20} />
          <span>Awaiting grading</span>
          <strong>{awaitingGrading}</strong>
        </article>

        <article>
          <CalendarDays size={20} />
          <span>Deadline</span>
          <strong>{assignment.deadline}</strong>
        </article>
      </section>

      <section className="student-detail-grid">
        <article className="student-detail-panel">
          <div className="command-panel-heading">
            <div>
              <p className="control-eyebrow">DISTRIBUTION</p>
              <h2>Assignment status</h2>
            </div>
          </div>

          <div className="assignment-detail-status">
            <div>
              <span>Submitted</span>
              <strong>{assignment.submitted}</strong>
            </div>

            <div>
              <span>Pending submission</span>
              <strong>{pending}</strong>
            </div>

            <div>
              <span>Graded</span>
              <strong>{assignment.graded}</strong>
            </div>

            <div>
              <span>Maximum marks</span>
              <strong>{assignment.maxMarks}</strong>
            </div>
          </div>
        </article>

        <article className="student-detail-panel">
          <div className="command-panel-heading">
            <div>
              <p className="control-eyebrow">GRADING PIPELINE</p>
              <h2>Assessment queue</h2>
            </div>
          </div>

          <div className="grading-queue-summary">
            <strong>{awaitingGrading}</strong>
            <span>submissions currently require grading</span>

            <button
              type="button"
              className="admin-primary-button"
              onClick={() => navigate('/admin/grading')}
            >
              Open Grading Center
            </button>
          </div>
        </article>
      </section>
    </div>
  )
}

export default AssignmentDetail