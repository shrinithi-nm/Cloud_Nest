import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Plus,
  Search,
  TrendingUp,
  Users
} from 'lucide-react'
import {
  getSubjects,
  saveSubjects
} from '../../services/adminData'

function SubjectsAdmin() {
    const navigate = useNavigate()
  const [subjects, setSubjects] = useState(getSubjects())
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    code: '',
    name: ''
  })

  const filteredSubjects = subjects.filter((subject) =>
    `${subject.code} ${subject.name}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!form.code.trim() || !form.name.trim()) return

    const newSubject = {
      id: `SUB${Date.now()}`,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      students: 0,
      average: 0
    }

    const updated = [...subjects, newSubject]

    setSubjects(updated)
    saveSubjects(updated)
    setForm({ code: '', name: '' })
    setShowForm(false)
  }

  return (
    <div>
      <section className="control-page-header">
        <div>
          <p className="control-eyebrow">ACADEMIC OPERATIONS</p>
          <h1>Subject Management</h1>
          <p>
            Manage the academic subjects available across the CloudNest
            student network.
          </p>
        </div>

        <button
          type="button"
          className="admin-primary-button"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus size={17} />
          Add Subject
        </button>
      </section>

      {showForm && (
        <form className="admin-create-form" onSubmit={handleSubmit}>
          <div>
            <label>Subject code</label>
            <input
              value={form.code}
              placeholder="DBMS"
              onChange={(event) =>
                setForm({
                  ...form,
                  code: event.target.value
                })
              }
            />
          </div>

          <div>
            <label>Subject name</label>
            <input
              value={form.name}
              placeholder="Database Systems"
              onChange={(event) =>
                setForm({
                  ...form,
                  name: event.target.value
                })
              }
            />
          </div>

          <button type="submit" className="admin-primary-button">
            Create Subject
          </button>
        </form>
      )}

      <div className="admin-search-box">
        <Search size={17} />
        <input
          placeholder="Search subjects..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <section className="subject-admin-grid">
        {filteredSubjects.map((subject) => (
          <article
  className="subject-admin-card subject-admin-clickable"
  key={subject.id}
  onClick={() => navigate(`/admin/subjects/${subject.id}`)}
>
            <div className="subject-admin-icon">
              <BookOpen size={21} />
            </div>

            <span className="subject-code">{subject.code}</span>
            <h2>{subject.name}</h2>

            <div className="subject-admin-stats">
              <div>
                <Users size={16} />
                <span>
                  <strong>{subject.students}</strong>
                  Students
                </span>
              </div>

              <div>
                <TrendingUp size={16} />
                <span>
                  <strong>{subject.average}%</strong>
                  Average
                </span>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}

export default SubjectsAdmin