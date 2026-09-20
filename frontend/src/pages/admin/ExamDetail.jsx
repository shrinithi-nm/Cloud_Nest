import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Edit3,
  FileText,
  Flag,
  Save,
  Users,
  X
} from 'lucide-react'
import {
  getAdminExams,
  updateAdminExam
} from '../../services/adminData'
import {
  getTargetStudents
} from '../../services/academicOperations'

function ExamDetail() {
  const navigate = useNavigate()
  const { examId } = useParams()

  const [exam, setExam] = useState(() =>
    getAdminExams().find(
      (item) => item.id === examId
    )
  )

  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState(() => ({
    title: exam?.title || '',
    subject: exam?.subject || '',
    date: exam?.date || '',
    maxMarks: exam?.maxMarks || 100,
    syllabus: exam?.syllabus || '',
    target: exam?.target || 'All Students',
    priority: exam?.priority || 'Normal',
    status: exam?.status || 'Draft'
  }))

  if (!exam) {
    return (
      <div className="student-not-found">
        <h1>Exam not found</h1>

        <button
          onClick={() =>
            navigate('/admin/exams')
          }
        >
          Return to Exam Control
        </button>
      </div>
    )
  }

  const updateField = (event) => {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value
    }))

    setSaved(false)
  }

  const cancelEditing = () => {
    setForm({
      title: exam.title || '',
      subject: exam.subject || '',
      date: exam.date || '',
      maxMarks: exam.maxMarks || 100,
      syllabus: exam.syllabus || '',
      target: exam.target || 'All Students',
      priority: exam.priority || 'Normal',
      status: exam.status || 'Draft'
    })

    setEditing(false)
  }

  const saveChanges = (event) => {
    event.preventDefault()

    const targetStudents = getTargetStudents(
      form.target
    )

    const updated = updateAdminExam(
      exam.id,
      {
        ...form,
        maxMarks: Number(form.maxMarks),
        students: targetStudents.length
      }
    )

    setExam(updated)
    setEditing(false)
    setSaved(true)
  }

  return (
    <div>
      <button
        type="button"
        className="student-back-button"
        onClick={() =>
          navigate('/admin/exams')
        }
      >
        <ArrowLeft size={17} />
        Exam Control
      </button>

      <section className="control-page-header">
        <div>
          <p className="control-eyebrow">
            {exam.subject}
          </p>

          <h1>{exam.title}</h1>

          <p>
            Manage exam configuration, syllabus,
            targeting and publication.
          </p>
        </div>

        <div className="exam-detail-actions">
          <span
            className={`fleet-badge ${
              exam.status === 'Published'
                ? 'risk-low'
                : 'risk-medium'
            }`}
          >
            {exam.status}
          </span>

          {!editing && (
            <button
              type="button"
              className="admin-primary-button"
              onClick={() => {
                setEditing(true)
                setSaved(false)
              }}
            >
              <Edit3 size={16} />
              Edit exam
            </button>
          )}
        </div>
      </section>

      {saved && (
        <div className="exam-save-success">
          Exam configuration updated successfully.
        </div>
      )}

      {editing ? (
        <form
          className="exam-management-form"
          onSubmit={saveChanges}
        >
          <div className="command-panel-heading">
            <div>
              <p className="control-eyebrow">
                EXAM CONFIGURATION
              </p>

              <h2>Edit exam</h2>
            </div>

            <button
              type="button"
              className="modal-close"
              onClick={cancelEditing}
            >
              <X size={18} />
            </button>
          </div>

          <div className="exam-edit-grid">
            <label>
              Exam title
              <input
                name="title"
                type="text"
                value={form.title}
                onChange={updateField}
                required
              />
            </label>

            <label>
              Subject
              <input
                name="subject"
                type="text"
                value={form.subject}
                onChange={updateField}
                required
              />
            </label>

            <label>
              Exam date
              <input
                name="date"
                type="date"
                value={form.date}
                onChange={updateField}
                required
              />
            </label>

            <label>
              Maximum marks
              <input
                name="maxMarks"
                type="number"
                min="1"
                value={form.maxMarks}
                onChange={updateField}
                required
              />
            </label>

            <label>
              Target students
              <select
                name="target"
                value={form.target}
                onChange={updateField}
              >
                <option>
                  All Students
                </option>

                <option>
                  High Risk Students
                </option>

                <option>
                  Overloaded Students
                </option>
              </select>
            </label>

            <label>
              Priority
              <select
                name="priority"
                value={form.priority}
                onChange={updateField}
              >
                <option>Normal</option>
                <option>High</option>
              </select>
            </label>

            <label>
              Publication status
              <select
                name="status"
                value={form.status}
                onChange={updateField}
              >
                <option>Draft</option>
                <option>Published</option>
              </select>
            </label>

            <label className="exam-syllabus-field">
              Syllabus
              <textarea
                name="syllabus"
                value={form.syllabus}
                onChange={updateField}
                placeholder="Docker, Kubernetes, Deployments, Services, HPA"
                required
              />
            </label>
          </div>

          <div className="exam-edit-actions">
            <button
              type="button"
              className="student-back-button"
              onClick={cancelEditing}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="admin-primary-button"
            >
              <Save size={16} />
              Save changes
            </button>
          </div>
        </form>
      ) : (
        <>
          <section className="student-detail-metrics">
            <article>
              <Users size={20} />
              <span>Assigned students</span>
              <strong>{exam.students}</strong>
            </article>

            <article>
              <CalendarDays size={20} />
              <span>Exam date</span>
              <strong>{exam.date}</strong>
            </article>

            <article>
              <FileText size={20} />
              <span>Maximum marks</span>
              <strong>{exam.maxMarks}</strong>
            </article>

            <article>
              <Flag size={20} />
              <span>Priority</span>
              <strong>
                {exam.priority || 'Normal'}
              </strong>
            </article>
          </section>

          <section className="exam-control-grid">
            <article className="student-detail-panel">
              <div className="command-panel-heading">
                <div>
                  <p className="control-eyebrow">
                    SYLLABUS
                  </p>

                  <h2>Assessment coverage</h2>
                </div>

                <BookOpen size={20} />
              </div>

              <div className="exam-syllabus-topics">
                {exam.syllabus ? (
                  exam.syllabus
                    .split(',')
                    .map((topic) => topic.trim())
                    .filter(Boolean)
                    .map((topic) => (
                      <span key={topic}>
                        {topic}
                      </span>
                    ))
                ) : (
                  <p>
                    No detailed syllabus has been
                    added for this exam.
                  </p>
                )}
              </div>
            </article>

            <article className="student-detail-panel">
              <div className="command-panel-heading">
                <div>
                  <p className="control-eyebrow">
                    DISTRIBUTION
                  </p>

                  <h2>Student targeting</h2>
                </div>

                <Users size={20} />
              </div>

              <div className="exam-distribution-info">
                <div>
                  <span>Target group</span>
                  <strong>
                    {exam.target ||
                      'All Students'}
                  </strong>
                </div>

                <div>
                  <span>Assigned students</span>
                  <strong>
                    {exam.students}
                  </strong>
                </div>

                <div>
                  <span>Publication</span>
                  <strong>
                    {exam.status}
                  </strong>
                </div>

                <div>
                  <span>Priority</span>
                  <strong>
                    {exam.priority ||
                      'Normal'}
                  </strong>
                </div>
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  )
}

export default ExamDetail