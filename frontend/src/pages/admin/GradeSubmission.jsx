import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  User
} from 'lucide-react'
import {
  getSubmissionById,
  gradeSubmission,
  initializeDemoSubmissions
} from '../../services/academicOperations'

function GradeSubmission() {
  const navigate = useNavigate()
  const { submissionId } = useParams()

  initializeDemoSubmissions()

  const submission = getSubmissionById(submissionId)

  const [marks, setMarks] = useState(
    submission?.marks ?? ''
  )

  const [feedback, setFeedback] = useState(
    submission?.feedback ?? ''
  )

  const [saved, setSaved] = useState(false)

  if (!submission) {
    return (
      <div className="student-not-found">
        <h1>Submission not found</h1>
        <button onClick={() => navigate('/admin/grading')}>
          Return to Grading Center
        </button>
      </div>
    )
  }

  const handleGrade = (event) => {
    event.preventDefault()

    const numericMarks = Number(marks)

    if (
      marks === '' ||
      numericMarks < 0 ||
      numericMarks > submission.maxMarks
    ) {
      return
    }

    gradeSubmission(
      submission.id,
      numericMarks,
      feedback
    )

    setSaved(true)
  }

  return (
    <div>
      <button
        type="button"
        className="student-back-button"
        onClick={() => navigate('/admin/grading')}
      >
        <ArrowLeft size={17} />
        Grading Center
      </button>

      <section className="control-page-header">
        <div>
          <p className="control-eyebrow">
            {submission.subject}
          </p>

          <h1>{submission.assignmentTitle}</h1>

          <p>
            Review the student's submission and publish assessment
            feedback.
          </p>
        </div>
      </section>

      <section className="grading-detail-grid">
        <article className="student-detail-panel">
          <div className="command-panel-heading">
            <div>
              <p className="control-eyebrow">SUBMISSION</p>
              <h2>Student information</h2>
            </div>

            <User size={20} />
          </div>

          <div className="grading-information">
            <div>
              <span>Student</span>
              <strong>{submission.studentName}</strong>
            </div>

            <div>
              <span>Student ID</span>
              <strong>{submission.studentId}</strong>
            </div>

            <div>
              <span>Submitted</span>
              <strong>{submission.submittedAt}</strong>
            </div>

            <div>
              <span>Maximum marks</span>
              <strong>{submission.maxMarks}</strong>
            </div>
          </div>
        </article>

        <form
          className="student-detail-panel grading-form"
          onSubmit={handleGrade}
        >
          <div className="command-panel-heading">
            <div>
              <p className="control-eyebrow">ASSESSMENT</p>
              <h2>Grade submission</h2>
            </div>

            <ClipboardCheck size={20} />
          </div>

          <label>
            Marks
            <input
              type="number"
              min="0"
              max={submission.maxMarks}
              value={marks}
              onChange={(event) =>
                setMarks(event.target.value)
              }
              required
            />
          </label>

          <label>
            Feedback
            <textarea
              rows="6"
              value={feedback}
              placeholder="Provide useful feedback for the student..."
              onChange={(event) =>
                setFeedback(event.target.value)
              }
            />
          </label>

          <button
            type="submit"
            className="admin-primary-button"
          >
            <CheckCircle2 size={17} />
            Publish Grade
          </button>

          {saved && (
            <div className="grade-success">
              <CheckCircle2 size={17} />
              Grade published successfully.
            </div>
          )}
        </form>
      </section>
    </div>
  )
}

export default GradeSubmission