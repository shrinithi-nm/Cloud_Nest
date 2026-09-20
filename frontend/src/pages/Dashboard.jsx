import { motion } from 'motion/react'
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Cloud,
  ArrowUpRight,
  Clock3,
  Target,
  Sparkles
} from 'lucide-react'

const stats = [
  {
    title: 'Active Subjects',
    value: '6',
    detail: 'Current semester',
    icon: BookOpen
  },
  {
    title: 'Upcoming Exams',
    value: '4',
    detail: 'Next 30 days',
    icon: CalendarDays
  },
  {
    title: 'Tasks Completed',
    value: '72%',
    detail: 'This semester',
    icon: CheckCircle2
  },
  {
    title: 'Cloud Status',
    value: 'Ready',
    detail: 'Workspace services',
    icon: Cloud
  }
]

const activities = [
  {
    title: 'Database Systems',
    detail: 'Revision task scheduled',
    time: 'Today'
  },
  {
    title: 'Operating Systems',
    detail: 'Exam roadmap in progress',
    time: '2 days'
  },
  {
    title: 'Cloud Computing',
    detail: '3 tasks remaining',
    time: 'This week'
  }
]

function Dashboard() {
  return (
    <div>
      <section className="page-header">
        <p className="page-eyebrow">Academic Command Center</p>
        <h1 className="page-title">Good morning.</h1>
        <p className="page-description">
          Your academic workload, upcoming priorities and cloud workspace in
          one place.
        </p>
      </section>

      <section className="dashboard-stats">
        {stats.map((stat, index) => {
          const Icon = stat.icon

          return (
            <motion.article
              className="stat-card card"
              key={stat.title}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.07 }}
              whileHover={{ y: -4 }}
            >
              <div className="stat-top">
                <div className="stat-icon">
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

      <section className="dashboard-grid">
        <motion.article
          className="focus-card card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="section-heading">
            <div>
              <p className="section-kicker">TODAY'S FOCUS</p>
              <h2>Stay ahead of your week</h2>
            </div>

            <Target size={22} />
          </div>

          <div className="focus-progress">
            <div className="progress-ring">
              <strong>72%</strong>
              <span>done</span>
            </div>

            <div>
              <h3>You're making progress</h3>
              <p>
                Complete your priority tasks before moving to lower-impact
                work.
              </p>
            </div>
          </div>

          <div className="progress-track">
            <div className="progress-fill"></div>
          </div>
        </motion.article>

        <motion.article
          className="next-exam-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
        >
          <div className="exam-glow"></div>

          <div className="section-heading">
            <div>
              <p className="section-kicker">NEXT EXAM</p>
              <h2>Database Systems</h2>
            </div>

            <CalendarDays size={22} />
          </div>

          <div className="exam-date">
            <strong>24</strong>
            <span>SEP</span>
          </div>

          <p>Roadmap preparation is currently in progress.</p>

          <button className="primary-button">
            Open roadmap
            <ArrowUpRight size={16} />
          </button>
        </motion.article>
      </section>

      <section className="dashboard-bottom">
        <article className="activity-card card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">ACTIVITY</p>
              <h2>Academic timeline</h2>
            </div>

            <Clock3 size={21} />
          </div>

          <div className="activity-list">
            {activities.map((activity) => (
              <div className="activity-item" key={activity.title}>
                <div className="activity-marker"></div>

                <div className="activity-copy">
                  <strong>{activity.title}</strong>
                  <span>{activity.detail}</span>
                </div>

                <span className="activity-time">{activity.time}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="insight-card card">
          <div className="insight-icon">
            <Sparkles size={22} />
          </div>

          <p className="section-kicker">SMART INSIGHT</p>
          <h2>Your workload looks manageable.</h2>
          <p>
            CloudNest will use your exams, syllabus progress and tasks to
            identify workload collisions.
          </p>

          <button className="secondary-button">View workload</button>
        </article>
      </section>
    </div>
  )
}

export default Dashboard