import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  Clock3,
  Search
} from 'lucide-react'
import {
  initializeDemoSubmissions
} from '../../services/academicOperations'

function GradingAdmin() {
  const navigate = useNavigate()

  const [submissions] = useState(
    initializeDemoSubmissions()
  )

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')

  const filtered = useMemo(() => {
    return submissions.filter((submission) => {
      const matchesSearch =
        submission.studentName
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        submission.assignmentTitle
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        submission.subject
          .toLowerCase()
          .includes(search.toLowerCase())

      const matchesStatus =
        status === 'All' || submission.status === status

      return matchesSearch && matchesStatus
    })
  }, [submissions, search, status])

  const pending = submissions.filter(
    (submission) => submission.status === 'Pending'
  ).length

  const graded = submissions.filter(
    (submission) => submission.status === 'Graded'
  ).length

  return (
    <div>
      <section className="control-page-header">
        <div>
          <p className="control-eyebrow">ACADEMIC OPERATIONS</p>
          <h1>Grading Center</h1>
          <p>
            Review student submissions, publish marks and provide
            academic feedback.
          </p>
        </div>
      </section>

      <section className="fleet-summary">
        <div>
          <Clock3 size={19} />
          <span>Awaiting grading</span>
          <strong>{pending}</strong>
        </div>

        <div>
          <CheckCircle2 size={19} />
          <span>Graded</span>
          <strong>{graded}</strong>
        </div>
      </section>

      <section className="fleet-panel">
        <div className="fleet-toolbar">
          <div className="fleet-search">
            <Search size={17} />
            <input
              value={search}
              placeholder="Search student, assignment or subject..."
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value)
            }
          >
            <option value="All">All submissions</option>
            <option value="Pending">Awaiting grading</option>
            <option value="Graded">Graded</option>
          </select>
        </div>

        <div className="fleet-table-wrapper">
          <table className="fleet-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Assignment</th>
                <th>Subject</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Marks</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((submission) => (
                <tr key={submission.id}>
                  <td>
                    <strong>{submission.studentName}</strong>
                  </td>

                  <td>{submission.assignmentTitle}</td>

                  <td>{submission.subject}</td>

                  <td>{submission.submittedAt}</td>

                  <td>
                    <span
                      className={
                        submission.status === 'Graded'
                          ? 'fleet-badge risk-low'
                          : 'fleet-badge risk-medium'
                      }
                    >
                      {submission.status}
                    </span>
                  </td>

                  <td>
                    {submission.marks === null
                      ? '—'
                      : `${submission.marks}/${submission.maxMarks}`}
                  </td>

                  <td>
                    <button
                      type="button"
                      className="grading-action-button"
                      onClick={() =>
                        navigate(
                          `/admin/grading/${submission.id}`
                        )
                      }
                    >
                      {submission.status === 'Graded'
                        ? 'Review'
                        : 'Grade'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default GradingAdmin