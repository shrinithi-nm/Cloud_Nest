import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Flame,
  Sparkles,
  Target
} from 'lucide-react'
import { generateRoadmap } from '../services/roadmap'

function Roadmap() {
  const { examId } = useParams()
  const navigate = useNavigate()
  const [saved, setSaved] = useState(false)

  const exam = useMemo(() => {
    const exams = JSON.parse(
      localStorage.getItem('cloudnest-exams') || '[]'
    )

    return exams.find(
      (item) => String(item.id) === String(examId)
    )
  }, [examId])

  const generatedPlan = useMemo(
    () =>
      exam
        ? generateRoadmap(exam)
        : {
            sessions: [],
            availableDays: 0,
            totalMinutes: 0,
            revisionSessions: 0
          },
    [exam]
  )

  const [sessions, setSessions] = useState(
    generatedPlan.sessions
  )

  const completedCount = sessions.filter(
    (session) => session.completed
  ).length

  const progress =
    sessions.length === 0
      ? 0
      : Math.round((completedCount / sessions.length) * 100)

  const toggleSession = (id) => {
    setSessions((current) =>
      current.map((session) =>
        session.id === id
          ? {
              ...session,
              completed: !session.completed
            }
          : session
      )
    )
  }

  const saveAsTasks = () => {
    if (!exam || sessions.length === 0) {
      return
    }

    const existingTasks = JSON.parse(
      localStorage.getItem('cloudnest-tasks') || '[]'
    )

    const otherTasks = existingTasks.filter(
      (task) => String(task.examId) !== String(exam.id)
    )

    const generatedTasks = sessions.map((session) => ({
      ...session,
      examId: exam.id,
      subject: exam.subject
    }))

    localStorage.setItem(
      'cloudnest-tasks',
      JSON.stringify([...otherTasks, ...generatedTasks])
    )

    localStorage.setItem(
      `cloudnest-roadmap-${exam.id}`,
      JSON.stringify({
        ...generatedPlan,
        sessions
      })
    )

    setSaved(true)
  }

  if (!exam) {
    return (
      <section className="roadmap-missing card">
        <h2>Exam not found</h2>
        <p>The selected exam is no longer available.</p>

        <button onClick={() => navigate('/exams')}>
          Return to exams
        </button>
      </section>
    )
  }

  if (sessions.length === 0) {
    return (
      <div>
        <button
          className="back-button"
          onClick={() => navigate('/exams')}
        >
          <ArrowLeft size={16} />
          Exams
        </button>

        <section className="roadmap-warning card">
          <CalendarDays size={25} />

          <div>
            <h2>Roadmap unavailable</h2>
            <p>
              Choose a future exam date and add syllabus topics before
              generating the roadmap.
            </p>
          </div>
        </section>
      </div>
    )
  }

  const totalHours = (generatedPlan.totalMinutes / 60).toFixed(1)

  return (
    <div>
      <button
        className="back-button"
        onClick={() => navigate('/exams')}
      >
        <ArrowLeft size={16} />
        Exams
      </button>

      <motion.section
        className="roadmap-dashboard card"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="roadmap-dashboard-main">
          <p className="page-eyebrow">SMART STUDY ROADMAP</p>

          <h1>{exam.subject}</h1>

          <p>
            A spaced preparation plan built around your syllabus and
            remaining time before the exam.
          </p>

          <div className="roadmap-dashboard-meta">
            <span>
              <CalendarDays size={15} />
              {generatedPlan.availableDays} days available
            </span>

            <span>
              <Target size={15} />
              {sessions.length} sessions
            </span>

            <span>
              <Clock3 size={15} />
              {totalHours} planned hours
            </span>

            <span>
              <Sparkles size={15} />
              {generatedPlan.revisionSessions} revisions
            </span>
          </div>
        </div>

        <div className="roadmap-readiness">
          <div>
            <span>Preparation readiness</span>
            <strong>{progress}%</strong>
          </div>

          <div className="readiness-track">
            <motion.div
              className="readiness-fill"
              animate={{ width: `${progress}%` }}
            />
          </div>

          <small>
            {completedCount} of {sessions.length} sessions completed
          </small>
        </div>
      </motion.section>

      <section className="roadmap-workspace">
        <div className="smart-timeline">
          {sessions.map((session, index) => {
            const previousPhase =
              index > 0 ? sessions[index - 1].phase : null

            const showPhase =
              index === 0 || session.phase !== previousPhase

            return (
              <div key={session.id}>
                {showPhase && (
                  <div className="phase-divider">
                    <span>{session.phase}</span>
                    <div></div>
                  </div>
                )}

                <motion.article
                  className={`smart-session ${
                    session.completed ? 'completed' : ''
                  }`}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: Math.min(index * 0.04, 0.4)
                  }}
                >
                  <div className="session-date">
                    <span>
                      {new Date(
                        `${session.date}T00:00:00`
                      ).toLocaleDateString('en-IN', {
                        month: 'short'
                      })}
                    </span>

                    <strong>
                      {new Date(
                        `${session.date}T00:00:00`
                      ).getDate()}
                    </strong>
                  </div>

                  <div className="session-content">
                    <div className="session-title-row">
                      <div>
                        <span className="session-type">
                          {session.type}
                        </span>

                        <h2>{session.title}</h2>
                      </div>

                      <button
                        type="button"
                        className={`session-check ${
                          session.completed ? 'checked' : ''
                        }`}
                        onClick={() =>
                          toggleSession(session.id)
                        }
                      >
                        {session.completed && (
                          <Check size={15} />
                        )}
                      </button>
                    </div>

                    {session.type
                      .toLowerCase()
                      .includes('revision') &&
                      session.topics?.length > 0 && (
                        <div className="revision-topics">
                          {session.topics.map((topic) => (
                            <span key={topic}>
                              {topic}
                            </span>
                          ))}
                        </div>
                      )}

                    <div className="session-footer">
                      <span>
                        <Clock3 size={14} />
                        {session.duration} min
                      </span>

                      <span>
                        <Target size={14} />
                        {session.activity}
                      </span>

                      <span
                        className={
                          session.priority === 'High'
                            ? 'high-priority'
                            : ''
                        }
                      >
                        <Flame size={14} />
                        {session.priority} priority
                      </span>
                    </div>
                  </div>
                </motion.article>
              </div>
            )
          })}
        </div>

        <aside className="roadmap-intelligence card">
          <p className="section-kicker">
            PLAN INTELLIGENCE
          </p>

          <h2>Preparation overview</h2>

          <div className="intelligence-grid">
            <div>
              <strong>
                {generatedPlan.availableDays}
              </strong>
              <span>Days available</span>
            </div>

            <div>
              <strong>{sessions.length}</strong>
              <span>Study sessions</span>
            </div>

            <div>
              <strong>
                {generatedPlan.revisionSessions}
              </strong>
              <span>Revision cycles</span>
            </div>

            <div>
              <strong>{totalHours}</strong>
              <span>Planned hours</span>
            </div>
          </div>

          <div className="intelligence-message">
            <Sparkles size={17} />

            <p>
              Learning sessions are spaced across the preparation
              window, leaving dedicated time for revision before
              the exam.
            </p>
          </div>

          <button
            type="button"
            className={`task-convert-button ${
              saved ? 'saved' : ''
            }`}
            onClick={saveAsTasks}
            disabled={saved}
          >
            <CheckCircle2 size={17} />
            {saved
              ? 'Roadmap added'
              : 'Add roadmap to tasks'}
          </button>
        </aside>
      </section>
    </div>
  )
}

export default Roadmap