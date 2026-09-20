import { useMemo } from 'react'
import { motion } from 'motion/react'
import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  Flame,
  Target,
  TrendingUp
} from 'lucide-react'

function Progress() {
  const tasks = useMemo(
    () =>
      JSON.parse(
        localStorage.getItem('cloudnest-tasks') || '[]'
      ),
    []
  )

  const stats = useMemo(() => {
    const completed = tasks.filter(
      (task) => task.completed
    )

    const pending = tasks.filter(
      (task) => !task.completed
    )

    const completedMinutes = completed.reduce(
      (total, task) =>
        total + (Number(task.duration) || 60),
      0
    )

    const totalMinutes = tasks.reduce(
      (total, task) =>
        total + (Number(task.duration) || 60),
      0
    )

    const completionRate =
      tasks.length === 0
        ? 0
        : Math.round(
            (completed.length / tasks.length) * 100
          )

    const subjects = {}

    tasks.forEach((task) => {
      const subject = task.subject || 'Personal'

      if (!subjects[subject]) {
        subjects[subject] = {
          total: 0,
          completed: 0,
          minutes: 0
        }
      }

      subjects[subject].total += 1
      subjects[subject].minutes +=
        Number(task.duration) || 60

      if (task.completed) {
        subjects[subject].completed += 1
      }
    })

    const subjectProgress = Object.entries(subjects)
      .map(([subject, data]) => ({
        subject,
        ...data,
        percentage:
          data.total === 0
            ? 0
            : Math.round(
                (data.completed / data.total) * 100
              )
      }))
      .sort(
        (a, b) => b.percentage - a.percentage
      )

    return {
      completed,
      pending,
      completedMinutes,
      totalMinutes,
      completionRate,
      subjectProgress
    }
  }, [tasks])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const overdue = stats.pending.filter((task) => {
    if (!task.date) {
      return false
    }

    const taskDate = new Date(
      `${task.date}T00:00:00`
    )

    return taskDate < today
  })

  const studyHours =
    Math.round(
      (stats.completedMinutes / 60) * 10
    ) / 10

  return (
    <div>
      <section className="progress-page-header">
        <div>
          <p className="page-eyebrow">
            LEARNING ANALYTICS
          </p>

          <h1 className="page-title">
            Progress
          </h1>

          <p className="page-description">
            Track completed study work, subject progress
            and preparation consistency across CloudNest.
          </p>
        </div>

        <div className="progress-score">
          <TrendingUp size={18} />

          <div>
            <strong>
              {stats.completionRate}%
            </strong>
            <span>Overall completion</span>
          </div>
        </div>
      </section>

      <section className="progress-stat-grid">
        <article className="progress-stat card">
          <CheckCircle2 size={19} />

          <div>
            <strong>
              {stats.completed.length}
            </strong>
            <span>Completed tasks</span>
          </div>
        </article>

        <article className="progress-stat card">
          <Target size={19} />

          <div>
            <strong>
              {stats.pending.length}
            </strong>
            <span>Remaining tasks</span>
          </div>
        </article>

        <article className="progress-stat card">
          <Clock3 size={19} />

          <div>
            <strong>{studyHours}h</strong>
            <span>Study completed</span>
          </div>
        </article>

        <article className="progress-stat card">
          <CircleAlert size={19} />

          <div>
            <strong>{overdue.length}</strong>
            <span>Overdue tasks</span>
          </div>
        </article>
      </section>

      <section className="progress-workspace">
        <motion.article
          className="progress-overview card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="progress-overview-header">
            <div>
              <p className="section-kicker">
                PREPARATION PROGRESS
              </p>

              <h2>
                Academic completion
              </h2>
            </div>

            <strong>
              {stats.completionRate}%
            </strong>
          </div>

          <div className="master-progress-track">
            <motion.div
              className="master-progress-fill"
              initial={{ width: 0 }}
              animate={{
                width: `${stats.completionRate}%`
              }}
              transition={{ duration: 0.7 }}
            ></motion.div>
          </div>

          <div className="progress-ratio">
            <span>
              {stats.completed.length} completed
            </span>

            <span>
              {stats.pending.length} remaining
            </span>
          </div>

          <div className="progress-divider"></div>

          <div className="subject-progress-list">
            <p className="section-kicker">
              SUBJECT BREAKDOWN
            </p>

            {stats.subjectProgress.length === 0 ? (
              <div className="progress-empty">
                No study activity yet.
              </div>
            ) : (
              stats.subjectProgress.map(
                (subject) => (
                  <div
                    className="subject-progress"
                    key={subject.subject}
                  >
                    <div className="subject-progress-heading">
                      <div>
                        <strong>
                          {subject.subject}
                        </strong>

                        <span>
                          {subject.completed} of{' '}
                          {subject.total} tasks
                        </span>
                      </div>

                      <strong>
                        {subject.percentage}%
                      </strong>
                    </div>

                    <div className="subject-progress-track">
                      <motion.div
                        className="subject-progress-fill"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${subject.percentage}%`
                        }}
                      ></motion.div>
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </motion.article>

        <aside className="progress-insight card">
          <p className="section-kicker">
            STUDY INSIGHT
          </p>

          <div className="insight-icon">
            <Flame size={22} />
          </div>

          <h2>
            {stats.completionRate >= 75
              ? 'Strong progress'
              : stats.completionRate >= 40
                ? 'Momentum building'
                : 'Preparation underway'}
          </h2>

          <p>
            You have completed{' '}
            <strong>
              {stats.completed.length}
            </strong>{' '}
            of{' '}
            <strong>{tasks.length}</strong>{' '}
            scheduled tasks and logged{' '}
            <strong>{studyHours} hours</strong>{' '}
            of completed study work.
          </p>

          {overdue.length > 0 && (
            <div className="progress-warning">
              <CircleAlert size={16} />

              <span>
                {overdue.length}{' '}
                {overdue.length === 1
                  ? 'task is'
                  : 'tasks are'}{' '}
                overdue.
              </span>
            </div>
          )}
        </aside>
      </section>
    </div>
  )
}

export default Progress