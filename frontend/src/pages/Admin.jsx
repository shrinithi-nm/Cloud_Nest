import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  BookOpen,
  CalendarDays,
  ListChecks,
  ShieldCheck,
  Search,
  Server,
  Cloud,
  ArrowUpRight,
  Activity,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import api from '../services/api'

function Admin() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [backendStatus, setBackendStatus] = useState('checking')

  const exams = useMemo(
    () => JSON.parse(localStorage.getItem('cloudnest-exams') || '[]'),
    []
  )

  const tasks = useMemo(
    () => JSON.parse(localStorage.getItem('cloudnest-tasks') || '[]'),
    []
  )

  const activeTasks = tasks.filter((task) => !task.completed)
  const completedTasks = tasks.filter((task) => task.completed)

  const subjects = [
    ...new Set(
      [
        ...exams.map((exam) => exam.subject),
        ...tasks.map((task) => task.subject)
      ].filter(Boolean)
    )
  ]

  const upcomingExams = exams
    .filter(
      (exam) =>
        exam.date &&
        new Date(`${exam.date}T23:59:59`) >= new Date()
    )
    .sort(
      (a, b) =>
        new Date(`${a.date}T00:00:00`) -
        new Date(`${b.date}T00:00:00`)
    )

  const filteredExams = upcomingExams.filter((exam) => {
    const value = `${exam.subject || ''} ${exam.name || ''}`.toLowerCase()
    return value.includes(search.toLowerCase())
  })

  useEffect(() => {
    let active = true

    const checkBackend = async () => {
      try {
        const response = await api.get('/api/health')

        if (active) {
          setBackendStatus(
            response.data.status === 'ok' ? 'online' : 'degraded'
          )
        }
      } catch {
        if (active) {
          setBackendStatus('offline')
        }
      }
    }

    checkBackend()

    return () => {
      active = false
    }
  }, [])

  const stats = [
    {
      title: 'Subjects',
      value: subjects.length,
      detail: 'Tracked in workspace',
      icon: BookOpen
    },
    {
      title: 'Upcoming Exams',
      value: upcomingExams.length,
      detail: 'Scheduled assessments',
      icon: CalendarDays
    },
    {
      title: 'Active Tasks',
      value: activeTasks.length,
      detail: 'Pending academic work',
      icon: ListChecks
    },
    {
      title: 'Completed Tasks',
      value: completedTasks.length,
      detail: 'Finished successfully',
      icon: CheckCircle2
    }
  ]

  return (
    <div className="admin-page">
      <section className="page-header admin-header">
        <div>
          <p className="page-eyebrow">Administration</p>
          <h1 className="page-title">Admin Control Center</h1>
          <p className="page-description">
            Monitor academic activity, system health and CloudNest operations
            from one workspace.
          </p>
        </div>

        <div className="admin-badge">
          <ShieldCheck size={18} />
          Administrator
        </div>
      </section>

      <section className="admin-stats">
        {stats.map((stat, index) => {
          const Icon = stat.icon

          return (
            <motion.article
              className="admin-stat-card card"
              key={stat.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              whileHover={{ y: -3 }}
            >
              <div className="admin-stat-top">
                <div className="admin-stat-icon">
                  <Icon size={20} />
                </div>
                <ArrowUpRight size={17} />
              </div>

              <p>{stat.title}</p>
              <h2>{stat.value}</h2>
              <span>{stat.detail}</span>
            </motion.article>
          )
        })}
      </section>

      <section className="admin-main-grid">
        <article className="admin-exams-card card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">ACADEMIC OPERATIONS</p>
              <h2>Upcoming examinations</h2>
            </div>

            <CalendarDays size={21} />
          </div>

          <div className="admin-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search examinations..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="admin-exam-list">
            {filteredExams.length > 0 ? (
              filteredExams.slice(0, 6).map((exam) => (
                <div className="admin-exam-row" key={exam.id}>
                  <div className="admin-exam-icon">
                    <BookOpen size={18} />
                  </div>

                  <div className="admin-exam-copy">
                    <strong>
                      {exam.subject ||
                        exam.name ||
                        exam.title ||
                        'Untitled exam'}
                    </strong>

                    <span>
                      {exam.date
                        ? new Date(
                            `${exam.date}T00:00:00`
                          ).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })
                        : 'Date unavailable'}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="admin-row-action"
                    onClick={() => navigate(`/roadmap/${exam.id}`)}
                  >
                    View
                  </button>
                </div>
              ))
            ) : (
              <div className="admin-empty-state">
                <CalendarDays size={28} />
                <strong>No examinations found</strong>
                <span>
                  Upcoming exams created in CloudNest will appear here.
                </span>
              </div>
            )}
          </div>
        </article>

        <div className="admin-side-stack">
          <article className="admin-system-card card">
            <div className="section-heading">
              <div>
                <p className="section-kicker">SYSTEM HEALTH</p>
                <h2>CloudNest services</h2>
              </div>

              <Activity size={21} />
            </div>

            <div className="admin-service-row">
              <div className="admin-service-icon">
                <Server size={19} />
              </div>

              <div>
                <strong>Backend API</strong>
                <span>Application service</span>
              </div>

              <div
                className={`admin-service-status ${
                  backendStatus === 'online'
                    ? 'admin-service-online'
                    : 'admin-service-offline'
                }`}
              >
                {backendStatus === 'online' ? (
                  <CheckCircle2 size={15} />
                ) : (
                  <AlertCircle size={15} />
                )}

                {backendStatus}
              </div>
            </div>

            <div className="admin-service-row">
              <div className="admin-service-icon">
                <Cloud size={19} />
              </div>

              <div>
                <strong>Frontend Runtime</strong>
                <span>Kubernetes deployment</span>
              </div>

              <div className="admin-service-status admin-service-online">
                <CheckCircle2 size={15} />
                configured
              </div>
            </div>

            <button
              type="button"
              className="secondary-button admin-cloud-button"
              onClick={() => navigate('/admin/cloud')}
            >
              Open Cloud Pulse
              <ArrowUpRight size={16} />
            </button>
          </article>

          <article className="admin-summary-card">
            <Users size={25} />

            <div>
              <p className="section-kicker">STUDENT MANAGEMENT</p>
              <h2>Academic intelligence ready</h2>
              <p>
                Student records, performance analytics and risk insights will
                connect to the shared CloudNest backend during integration.
              </p>
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}

export default Admin