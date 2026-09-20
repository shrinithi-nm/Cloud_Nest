import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  CalendarDays,
  Plus,
  X,
  BookOpen,
  Clock3,
  Trash2,
  Sparkles,
  ShieldCheck
} from 'lucide-react'
import { getAdminExams } from '../services/adminData'

function Exams() {
  const navigate = useNavigate()

  const [personalExams, setPersonalExams] = useState(() => {
    const savedExams = localStorage.getItem('cloudnest-exams')
    return savedExams ? JSON.parse(savedExams) : []
  })

  const [showForm, setShowForm] = useState(false)
  const [subject, setSubject] = useState('')
  const [date, setDate] = useState('')
  const [topics, setTopics] = useState('')

  const adminExams = getAdminExams()
    .filter((exam) => exam.status === 'Published')
    .map((exam) => ({
      ...exam,
      syllabus:
        typeof exam.syllabus === 'string'
          ? exam.syllabus
              .split(',')
              .map((topic) => topic.trim())
              .filter(Boolean)
          : exam.syllabus || [],
      source: 'admin'
    }))

  const studentExams = personalExams.map((exam) => ({
    ...exam,
    source: 'personal'
  }))

  const exams = [...adminExams, ...studentExams]

  useEffect(() => {
    localStorage.setItem(
      'cloudnest-exams',
      JSON.stringify(personalExams)
    )
  }, [personalExams])

  const addExam = (event) => {
    event.preventDefault()

    const syllabus = topics
      .split(',')
      .map((topic) => topic.trim())
      .filter(Boolean)

    const newExam = {
      id: Date.now(),
      subject,
      date,
      syllabus
    }

    setPersonalExams((current) => [
      ...current,
      newExam
    ])

    setSubject('')
    setDate('')
    setTopics('')
    setShowForm(false)
  }

  const deleteExam = (id) => {
    setPersonalExams((current) =>
      current.filter((exam) => exam.id !== id)
    )
  }

  const getDaysRemaining = (examDate) => {
    const today = new Date()
    const target = new Date(`${examDate}T23:59:59`)
    const difference = target - today

    return Math.max(
      0,
      Math.ceil(difference / 86400000)
    )
  }

  const openRoadmap = (exam) => {
    const existing = JSON.parse(
      localStorage.getItem('cloudnest-exams') || '[]'
    )

    const alreadyStored = existing.some(
      (item) => String(item.id) === String(exam.id)
    )

    if (!alreadyStored) {
      const roadmapExam = {
        id: exam.id,
        subject: exam.subject,
        date: exam.date,
        syllabus: exam.syllabus,
        source: exam.source
      }

      localStorage.setItem(
        'cloudnest-exams',
        JSON.stringify([...existing, roadmapExam])
      )
    }

    navigate(`/roadmap/${exam.id}`)
  }

  return (
    <div>
      <section className="page-header exam-page-header">
        <div>
          <p className="page-eyebrow">
            Exam Intelligence
          </p>

          <h1 className="page-title">
            Exams & syllabus
          </h1>

          <p className="page-description">
            Track published assessments and personal exams.
            CloudNest can transform each syllabus into a
            personalized study roadmap.
          </p>
        </div>

        <button
          className="add-exam-button"
          onClick={() => setShowForm(true)}
        >
          <Plus size={17} />
          Add personal exam
        </button>
      </section>

      {exams.length === 0 ? (
        <motion.section
          className="empty-exams card"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="empty-icon">
            <CalendarDays size={27} />
          </div>

          <h2>No exams yet</h2>

          <p>
            No exams have been published and you have not
            added any personal exams yet.
          </p>

          <button
            className="primary-action"
            onClick={() => setShowForm(true)}
          >
            <Plus size={16} />
            Add first exam
          </button>
        </motion.section>
      ) : (
        <section className="exam-grid">
          {exams.map((exam, index) => (
            <motion.article
              className="exam-card card"
              key={`${exam.source}-${exam.id}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.06
              }}
            >
              <div className="exam-card-top">
                <div className="exam-subject-icon">
                  <BookOpen size={19} />
                </div>

                {exam.source === 'admin' ? (
                  <span className="admin-exam-badge">
                    <ShieldCheck size={13} />
                    Published
                  </span>
                ) : (
                  <button
                    className="delete-button"
                    onClick={() =>
                      deleteExam(exam.id)
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <h2>{exam.subject}</h2>

              {exam.title && (
                <p className="exam-admin-title">
                  {exam.title}
                </p>
              )}

              <div className="exam-meta">
                <span>
                  <CalendarDays size={14} />

                  {new Date(
                    `${exam.date}T00:00:00`
                  ).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>

                <span>
                  <Clock3 size={14} />
                  {getDaysRemaining(exam.date)} days left
                </span>
              </div>

              <div className="syllabus-preview">
                <p>Syllabus</p>

                <div className="topic-list">
                  {exam.syllabus
                    .slice(0, 4)
                    .map((topic) => (
                      <span key={topic}>
                        {topic}
                      </span>
                    ))}

                  {exam.syllabus.length > 4 && (
                    <span>
                      +{exam.syllabus.length - 4} more
                    </span>
                  )}

                  {exam.syllabus.length === 0 && (
                    <span>
                      Syllabus not provided
                    </span>
                  )}
                </div>
              </div>

              <button
                className="roadmap-button"
                onClick={() =>
                  openRoadmap(exam)
                }
              >
                <Sparkles size={15} />
                Generate roadmap
              </button>
            </motion.article>
          ))}
        </section>
      )}

      {showForm && (
        <div className="modal-backdrop">
          <motion.div
            className="exam-modal"
            initial={{
              opacity: 0,
              scale: 0.96,
              y: 12
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0
            }}
          >
            <div className="modal-header">
              <div>
                <p className="page-eyebrow">
                  PERSONAL EXAM
                </p>

                <h2>Add exam</h2>
              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setShowForm(false)
                }
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={addExam}>
              <label>
                Subject

                <input
                  type="text"
                  placeholder="Database Systems"
                  value={subject}
                  onChange={(event) =>
                    setSubject(event.target.value)
                  }
                  required
                />
              </label>

              <label>
                Exam date

                <input
                  type="date"
                  value={date}
                  onChange={(event) =>
                    setDate(event.target.value)
                  }
                  required
                />
              </label>

              <label>
                Syllabus topics

                <textarea
                  placeholder="Normalization, SQL, Transactions, Indexing"
                  value={topics}
                  onChange={(event) =>
                    setTopics(event.target.value)
                  }
                  required
                />
              </label>

              <p className="input-help">
                Separate each syllabus topic using a comma.
              </p>

              <button
                className="save-exam-button"
                type="submit"
              >
                Add to CloudNest
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default Exams