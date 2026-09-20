import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  Plus,
  Users
} from 'lucide-react'
import {
  createAssignment,
  getAssignments,
  getStudents,
  getSubjects
} from '../../services/adminData'

function AssignmentsAdmin() {
  const navigate = useNavigate()
  const students = getStudents()
  const subjects = getSubjects()

  const [assignments, setAssignments] = useState(getAssignments())
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState({
    title: '',
    subject: subjects[0]?.name || '',
    deadline: '',
    maxMarks: 20,
    target: 'All Students'
  })

  const handleSubmit = (event) => {
    event.preventDefault()

    if (
      !form.title.trim() ||
      !form.subject ||
      !form.deadline ||
      Number(form.maxMarks) <= 0
    ) {
      return
    }

    const created = createAssignment({
      title: form.title.trim(),
      subject: form.subject,
      deadline: form.deadline,
      maxMarks: Number(form.maxMarks),
      target: form.target,
      assigned: students.length
    })

    setAssignments([created, ...assignments])

    setForm({
      title: '',
      subject: subjects[0]?.name || '',
      deadline: '',
      maxMarks: 20,
      target: 'All Students'
    })

    setShowForm(false)
  }

  return (
    <div>
      <section className="control-page-header">
        <div>
          <p className="control-eyebrow">ACADEMIC OPERATIONS</p>
          <h1>Assignment Center</h1>
          <p>
            Create coursework, distribute it to students and monitor
            submission and grading progress.
          </p>
        </div>

        <button
          type="button"
          className="admin-primary-button"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus size={17} />
          Create Assignment
        </button>
      </section>

      {showForm && (
        <form
          className="admin-create-form assignment-create-form"
          onSubmit={handleSubmit}
        >
          <div>
            <label>Assignment title</label>
            <input
              value={form.title}
              placeholder="Kubernetes Deployment Lab"
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
                <option key={subject.id} value={subject.name}>
                  {subject.code} · {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Deadline</label>
            <input
              type="date"
              value={form.deadline}
              onChange={(event) =>
                setForm({
                  ...form,
                  deadline: event.target.value
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

          <button type="submit" className="admin-primary-button">
            Publish Assignment
          </button>
        </form>
      )}

      <section className="assignment-admin-grid">
        {assignments.map((assignment) => {
          const submissionRate =
            assignment.assigned > 0
              ? Math.round(
                  (assignment.submitted / assignment.assigned) * 100
                )
              : 0

          return (
            <article
              className="assignment-admin-card"
              key={assignment.id}
            >
              <div className="assignment-card-header">
                <div className="subject-admin-icon">
                  <ClipboardCheck size={20} />
                </div>

                <span className="fleet-badge risk-low">
                  {assignment.status}
                </span>
              </div>

              <p className="control-eyebrow">{assignment.subject}</p>
              <h2>{assignment.title}</h2>

              <div className="assignment-meta">
                <span>
                  <CalendarDays size={15} />
                  {assignment.deadline}
                </span>

                <span>
                  <Users size={15} />
                  {assignment.assigned} assigned
                </span>
              </div>

              <div className="assignment-progress">
                <div>
                  <span>Submission progress</span>
                  <strong>{submissionRate}%</strong>
                </div>

                <div className="student-progress-track">
                  <span
                    style={{
                      width: `${submissionRate}%`
                    }}
                  ></span>
                </div>
              </div>

              <div className="assignment-counts">
                <div>
                  <strong>{assignment.submitted}</strong>
                  <span>Submitted</span>
                </div>

                <div>
                  <strong>{assignment.graded}</strong>
                  <span>Graded</span>
                </div>

                <div>
                  <strong>{assignment.maxMarks}</strong>
                  <span>Marks</span>
                </div>
              </div>

              <button
                type="button"
                className="control-action-button"
                onClick={() =>
                  navigate(`/admin/assignments/${assignment.id}`)
                }
              >
                Manage assignment
                <ArrowRight size={16} />
              </button>
            </article>
          )
        })}
      </section>
    </div>
  )
}

export default AssignmentsAdmin