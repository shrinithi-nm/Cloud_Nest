import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  ClipboardCheck,
  FileText,
  TrendingUp,
  Users
} from 'lucide-react'
import {
  getAssignments,
  getAdminExams,
  getSubjects
} from '../../services/adminData'

function SubjectDetail() {
  const navigate = useNavigate()
  const { subjectId } = useParams()

  const subject = getSubjects().find(
    (item) => item.id === subjectId
  )

  if (!subject) {
    return (
      <div className="student-not-found">
        <h1>Subject not found</h1>
        <button onClick={() => navigate('/admin/subjects')}>
          Return to Subjects
        </button>
      </div>
    )
  }

  const assignments = getAssignments().filter(
    (assignment) => assignment.subject === subject.name
  )

  const exams = getAdminExams().filter(
    (exam) => exam.subject === subject.name
  )

  return (
    <div>
      <button
        type="button"
        className="student-back-button"
        onClick={() => navigate('/admin/subjects')}
      >
        <ArrowLeft size={17} />
        Subject Management
      </button>

      <section className="control-page-header">
        <div>
          <p className="control-eyebrow">{subject.code}</p>
          <h1>{subject.name}</h1>
          <p>
            Manage students, assessments and academic performance for this
            subject.
          </p>
        </div>
      </section>

      <section className="student-detail-metrics">
        <article>
          <Users size={20} />
          <span>Enrolled students</span>
          <strong>{subject.students}</strong>
        </article>

        <article>
          <TrendingUp size={20} />
          <span>Class average</span>
          <strong>{subject.average}%</strong>
        </article>

        <article>
          <ClipboardCheck size={20} />
          <span>Assignments</span>
          <strong>{assignments.length}</strong>
        </article>

        <article>
          <FileText size={20} />
          <span>Exams</span>
          <strong>{exams.length}</strong>
        </article>
      </section>

      <section className="student-detail-grid">
        <article className="student-detail-panel">
          <div className="command-panel-heading">
            <div>
              <p className="control-eyebrow">COURSEWORK</p>
              <h2>Assignments</h2>
            </div>

            <ClipboardCheck size={20} />
          </div>

          <div className="subject-detail-list">
            {assignments.length === 0 ? (
              <div className="subject-detail-empty">
                No assignments created for this subject.
              </div>
            ) : (
              assignments.map((assignment) => (
                <button
                  type="button"
                  key={assignment.id}
                  onClick={() =>
                    navigate(`/admin/assignments/${assignment.id}`)
                  }
                >
                  <span>
                    <strong>{assignment.title}</strong>
                    <small>Deadline {assignment.deadline}</small>
                  </span>

                  <span>
                    {assignment.submitted}/{assignment.assigned}
                  </span>
                </button>
              ))
            )}
          </div>
        </article>

        <article className="student-detail-panel">
          <div className="command-panel-heading">
            <div>
              <p className="control-eyebrow">ASSESSMENTS</p>
              <h2>Exams</h2>
            </div>

            <FileText size={20} />
          </div>

          <div className="subject-detail-list">
            {exams.length === 0 ? (
              <div className="subject-detail-empty">
                No exams published for this subject.
              </div>
            ) : (
              exams.map((exam) => (
                <div className="subject-exam-row" key={exam.id}>
                  <span>
                    <strong>{exam.title}</strong>
                    <small>{exam.date}</small>
                  </span>

                  <span>{exam.maxMarks} marks</span>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="subject-performance-panel">
        <div className="command-panel-heading">
          <div>
            <p className="control-eyebrow">PERFORMANCE INTELLIGENCE</p>
            <h2>Subject health</h2>
          </div>

          <BookOpen size={20} />
        </div>

        <div className="subject-health-score">
          <div>
            <strong>{subject.average}%</strong>
            <span>Current cohort average</span>
          </div>

          <div className="student-progress-track">
            <span
              style={{
                width: `${subject.average}%`
              }}
            ></span>
          </div>
        </div>
      </section>
    </div>
  )
}

export default SubjectDetail