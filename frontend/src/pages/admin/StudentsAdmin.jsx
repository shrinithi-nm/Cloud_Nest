import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Search,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Users
} from 'lucide-react'
import { getStudents } from '../../services/adminData'

function StudentsAdmin() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState('All')

  const students = getStudents()

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(search.toLowerCase()) ||
        student.email.toLowerCase().includes(search.toLowerCase()) ||
        student.id.toLowerCase().includes(search.toLowerCase())

      const matchesRisk =
        riskFilter === 'All' || student.risk === riskFilter

      return matchesSearch && matchesRisk
    })
  }, [students, search, riskFilter])

  const highRisk = students.filter(
    (student) => student.risk === 'High'
  ).length

  const improving = students.filter(
    (student) => student.growth > 0
  ).length

  const overloaded = students.filter(
    (student) => student.workload === 'Overloaded'
  ).length

  return (
    <div>
      <section className="control-page-header">
        <div>
          <p className="control-eyebrow">ACADEMIC OPERATIONS</p>
          <h1>Student Fleet</h1>
          <p>
            Monitor academic health, workload, progress and growth across
            every CloudNest student workspace.
          </p>
        </div>
      </section>

      <section className="fleet-summary">
        <div>
          <Users size={19} />
          <span>Total students</span>
          <strong>{students.length}</strong>
        </div>

        <div>
          <TrendingUp size={19} />
          <span>Improving</span>
          <strong>{improving}</strong>
        </div>

        <div>
          <TrendingDown size={19} />
          <span>High risk</span>
          <strong>{highRisk}</strong>
        </div>

        <div>
          <SlidersHorizontal size={19} />
          <span>Overloaded</span>
          <strong>{overloaded}</strong>
        </div>
      </section>

      <section className="fleet-panel">
        <div className="fleet-toolbar">
          <div className="fleet-search">
            <Search size={17} />
            <input
              type="text"
              placeholder="Search by student, email or ID..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            value={riskFilter}
            onChange={(event) => setRiskFilter(event.target.value)}
          >
            <option value="All">All risk levels</option>
            <option value="Low">Low risk</option>
            <option value="Medium">Medium risk</option>
            <option value="High">High risk</option>
          </select>
        </div>

        <div className="fleet-table-wrapper">
          <table className="fleet-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Average</th>
                <th>Growth</th>
                <th>Completion</th>
                <th>Workload</th>
                <th>Risk</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td>
                    <div className="fleet-student">
                      <div>
                        {student.name
                          .split(' ')
                          .map((part) => part[0])
                          .join('')
                          .slice(0, 2)}
                      </div>

                      <span>
                        <strong>{student.name}</strong>
                        <small>
                          {student.id} · {student.email}
                        </small>
                      </span>
                    </div>
                  </td>

                  <td>
                    <strong>{student.average}%</strong>
                  </td>

                  <td>
                    <span
                      className={
                        student.growth >= 0
                          ? 'growth-positive'
                          : 'growth-negative'
                      }
                    >
                      {student.growth >= 0 ? (
                        <TrendingUp size={15} />
                      ) : (
                        <TrendingDown size={15} />
                      )}

                      {student.growth > 0 ? '+' : ''}
                      {student.growth}%
                    </span>
                  </td>

                  <td>{student.completion}%</td>

                  <td>
                    <span
                      className={`fleet-badge workload-${student.workload.toLowerCase()}`}
                    >
                      {student.workload}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`fleet-badge risk-${student.risk.toLowerCase()}`}
                    >
                      {student.risk}
                    </span>
                  </td>

                  <td>
                    <button
                      type="button"
                      className="fleet-open-button"
                      onClick={() =>
                        navigate(`/admin/students/${student.id}`)
                      }
                    >
                      <ArrowRight size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredStudents.length === 0 && (
            <div className="fleet-empty">
              No students match the selected filters.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default StudentsAdmin