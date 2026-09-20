import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  FileText,
  Plus,
  Users
} from 'lucide-react'
import {
  createAdminExam,
  getAdminExams,
  getStudents,
  getSubjects
} from '../../services/adminData'

function ExamsAdmin() {
  const navigate = useNavigate()

  const students = getStudents()
  const subjects = getSubjects()

  const [exams, setExams] = useState(getAdminExams())
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState({
    title: '',
    subject: subjects[0]?.name || '',
    date: '',
    maxMarks: 100,
    syllabus: '',
    target: 'All Students'
  })

  const handleSubmit = (event) => {
    event.preventDefault()

    if (
      !form.title.trim() ||
      !form.subject ||
      !form.date ||
      Number(form.maxMarks) <= 0
    ) {
      return
    }

    const created = createAdminExam({
      title: form.title.trim(),
      subject: form.subject,
      date: form.date,
      maxMarks: Number(form.maxMarks),
      syllabus: form.syllabus.trim(),
      target: form.target,
      students: students.length
    })

    setExams([created, ...exams])

    setForm({
      title: '',
      subject: subjects[0]?.name || '',
      date: '',
      maxMarks: 100,
      syllabus: '',
      target: 'All Students'
    })

    setShowForm(false)
  }

  return (
    <div>
      <section className="control-page-header">
        <div>
          <p className="control-eyebrow">
            ACADEMIC OPERATIONS
          </p>

          <h1>Exam Control Center</h1>

          <p>
            Create assessments, define syllabus coverage and publish
            exams to CloudNest students.
          </p>
        </div>

        <button
          type="button"
          className="admin-primary-button"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus size={17} />
          Create Exam
        </button>
      </section>

      {showForm && (
        <form
          className="admin-create-form exam-create-form"
          onSubmit={handleSubmit}
        >
          <div>
            <label>Exam title</label>
            <input
              value={form.title}
              placeholder="Cloud Computing FAT"
              onChange={(event) =>
                setForm({
                  ...form,
                  title: event.target.value
                })
              }
            />
          </div>

          <div>
            <label>Subject</label>
            <select
              value={form.subject}
              onChange={(event) =>
                setForm({
                  ...form,
                  subject: event.target.value
                })
              }
            >
              {subjects.map((subject) => (
                <option
                  key={subject.id}
                  value={subject.name}
                >
                  {subject.code} · {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(event) =>
                setForm({
                  ...form,
                  date: event.target.value
                })
              }
            />
          </div>

          <div>
            <label>Maximum marks</label>
            <input
              type="number"
              min="1"
              value={form.maxMarks}
              onChange={(event) =>
                setForm({
                  ...form,
                  maxMarks: event.target.value
                })
              }
            />
          </div>

          <div>
            <label>Assign to</label>
            <select
              value={form.target}
              onChange={(event) =>
                setForm({
                  ...form,
                  target: event.target.value
                })
              }
            >
              <option>All Students</option>
              <option>High Risk Students</option>
              <option>Overloaded Students</option>
            </select>
          </div>

          <div className="exam-syllabus-field">
            <label>Syllabus</label>
            <textarea
              rows="4"
              value={form.syllabus}
              placeholder="Kubernetes, containers, autoscaling, cloud architecture..."
              onChange={(event) =>
                setForm({
                  ...form,
                  syllabus: event.target.value
                })
              }
            />
          </div>

          <button
            type="submit"
            className="admin-primary-button"
          >
            Publish Exam
          </button>
        </form>
      )}

      <section className="exam-admin-grid">
        {exams.map((exam) => (
          <article className="exam-admin-card" key={exam.id}>
            <div className="assignment-card-header">
              <div className="subject-admin-icon">
                <FileText size={20} />
              </div>

              <span className="fleet-badge risk-low">
                {exam.status}
              </span>
            </div>

            <p className="control-eyebrow">
              {exam.subject}
            </p>

            <h2>{exam.title}</h2>

            <div className="assignment-meta">
              <span>
                <CalendarDays size={15} />
                {exam.date}
              </span>

              <span>
                <Users size={15} />
                {exam.students} students
              </span>
            </div>

            <div className="exam-card-footer">
              <span>{exam.maxMarks} marks</span>

              <button
                type="button"
                className="control-action-button"
                onClick={() =>
                  navigate(`/admin/exams/${exam.id}`)
                }
              >
                Manage exam
                <ArrowRight size={16} />
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}

export default ExamsAdmin