import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'

import {
  CalendarDays,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ListTodo,
  Plus,
  Sparkles,
  Trash2,
  X
} from 'lucide-react'
import { analyzeWorkload } from '../services/workload'

function Tasks() {
  const [tasks, setTasks] = useState(() =>
    JSON.parse(localStorage.getItem('cloudnest-tasks') || '[]')
  )

  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [date, setDate] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [duration, setDuration] = useState(60)
  const workload = useMemo(
  () => analyzeWorkload(tasks),
  [tasks]
)

  useEffect(() => {
    localStorage.setItem('cloudnest-tasks', JSON.stringify(tasks))
  }, [tasks])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const getTaskDate = (task) => {
    const taskDate = new Date(`${task.date}T00:00:00`)
    taskDate.setHours(0, 0, 0, 0)
    return taskDate
  }

  const getStatus = (task) => {
    if (task.completed) {
      return 'completed'
    }

    const taskDate = getTaskDate(task)

    if (taskDate < today) {
      return 'overdue'
    }

    if (taskDate.getTime() === today.getTime()) {
      return 'today'
    }

    return 'upcoming'
  }

  const sortedTasks = useMemo(() => {
    return [...tasks].sort(
      (a, b) => getTaskDate(a) - getTaskDate(b)
    )
  }, [tasks])

  const filteredTasks = sortedTasks.filter((task) => {
    if (filter === 'all') {
      return true
    }

    return getStatus(task) === filter
  })

  const todayCount = tasks.filter(
    (task) => getStatus(task) === 'today'
  ).length

  const upcomingCount = tasks.filter(
    (task) => getStatus(task) === 'upcoming'
  ).length

  const overdueCount = tasks.filter(
    (task) => getStatus(task) === 'overdue'
  ).length

  const completedCount = tasks.filter(
    (task) => task.completed
  ).length

  const toggleTask = (id) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? {
              ...task,
              completed: !task.completed
            }
          : task
      )
    )
  }

  const deleteTask = (id) => {
    setTasks((current) =>
      current.filter((task) => task.id !== id)
    )
  }

  const addTask = (event) => {
    event.preventDefault()

    const newTask = {
      id: `manual-${Date.now()}`,
      title,
      subject: subject || 'Personal',
      date,
      priority,
      duration: Number(duration),
      activity: 'Manual task',
      type: 'Manual',
      completed: false,
      source: 'manual'
    }

    setTasks((current) => [...current, newTask])

    setTitle('')
    setSubject('')
    setDate('')
    setPriority('Medium')
    setDuration(60)
    setShowForm(false)
  }

  return (
    <div>
      <section className="task-page-header">
        <div>
          <p className="page-eyebrow">SMART WORKSPACE</p>
          <h1 className="page-title">Tasks</h1>
          <p className="page-description">
            Roadmap sessions and personal tasks come together in one
            intelligent academic queue.
          </p>
        </div>

        <button
          className="add-exam-button"
          onClick={() => setShowForm(true)}
        >
          <Plus size={17} />
          Add task
        </button>
      </section>

      <section className="task-stat-grid">
        <article className="task-stat card">
          <CalendarDays size={19} />
          <div>
            <strong>{todayCount}</strong>
            <span>Due today</span>
          </div>
        </article>

        <article className="task-stat card">
          <Clock3 size={19} />
          <div>
            <strong>{upcomingCount}</strong>
            <span>Upcoming</span>
          </div>
        </article>

        <article className="task-stat card">
          <CircleAlert size={19} />
          <div>
            <strong>{overdueCount}</strong>
            <span>Overdue</span>
          </div>
        </article>

        <article className="task-stat card">
          <CheckCircle2 size={19} />
          <div>
            <strong>{completedCount}</strong>
            <span>Completed</span>
          </div>
        </article>
      </section>

      <section className="task-toolbar">
        {['all', 'today', 'upcoming', 'overdue', 'completed'].map(
          (item) => (
            <button
              key={item}
              className={filter === item ? 'active' : ''}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          )
        )}
      </section>

      <section className="task-workspace">
        <div className="task-list">
          {filteredTasks.length === 0 ? (
            <div className="task-empty card">
              <ListTodo size={27} />
              <h2>No tasks here</h2>
              <p>
                Tasks generated from your study roadmaps will appear
                automatically.
              </p>
            </div>
          ) : (
            filteredTasks.map((task, index) => {
              const status = getStatus(task)

              return (
                <motion.article
                  className={`smart-task card ${
                    task.completed ? 'completed' : ''
                  }`}
                  key={task.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: Math.min(index * 0.04, 0.3)
                  }}
                >
                  <button
                    className={`task-check ${
                      task.completed ? 'checked' : ''
                    }`}
                    onClick={() => toggleTask(task.id)}
                  >
                    {task.completed && <Check size={15} />}
                  </button>

                  <div className="task-main">
                    <div className="task-title-row">
                      <div>
                        <span>{task.subject}</span>
                        <h2>{task.title}</h2>
                      </div>

                      <span
                        className={`task-status ${status}`}
                      >
                        {status}
                      </span>
                    </div>

                    <div className="task-metadata">
                      <span>
                        <CalendarDays size={13} />
                        {new Date(
                          `${task.date}T00:00:00`
                        ).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </span>

                      <span>
                        <Clock3 size={13} />
                        {task.duration || 60} min
                      </span>

                      <span
                        className={`task-priority ${String(
                          task.priority || 'Medium'
                        ).toLowerCase()}`}
                      >
                        {task.priority || 'Medium'} priority
                      </span>

                      {task.source !== 'manual' && (
                        <span className="generated-label">
                          <Sparkles size={12} />
                          Roadmap
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    className="task-delete"
                    onClick={() => deleteTask(task.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.article>
              )
            })
          )}
        </div>

        <aside className="workload-panel card">
  <p className="section-kicker">WORKLOAD INTELLIGENCE</p>
  <h2>Academic load</h2>

  <div className="workload-number">
    <strong>
      {Math.round((workload.totalMinutes / 60) * 10) / 10}h
    </strong>
    <span>remaining scheduled work</span>
  </div>

  <div className="workload-summary">
    <div>
      <strong>{workload.days.length}</strong>
      <span>Active days</span>
    </div>

    <div>
      <strong>{workload.busyDays.length}</strong>
      <span>Busy days</span>
    </div>

    <div>
      <strong>{workload.overloadedDays.length}</strong>
      <span>Overloaded</span>
    </div>
  </div>

  <div className="summary-rule"></div>

  {workload.overloadedDays.length > 0 ? (
    <div className="collision-warning">
      <CircleAlert size={17} />

      <div>
        <strong>Workload collision detected</strong>
        <p>
          {workload.overloadedDays.length}{' '}
          {workload.overloadedDays.length === 1
            ? 'day has'
            : 'days have'}{' '}
          more than 3 hours of scheduled work.
        </p>
      </div>
    </div>
  ) : (
    <div className="balanced-message">
      <CheckCircle2 size={17} />

      <div>
        <strong>Workload looks balanced</strong>
        <p>
          No study day currently exceeds the recommended
          workload limit.
        </p>
      </div>
    </div>
  )}

  {workload.peakDay && (
    <div className="peak-workload">
      <span>HEAVIEST DAY</span>

      <strong>
        {new Date(
          `${workload.peakDay.date}T00:00:00`
        ).toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short'
        })}
      </strong>

      <p>
        {workload.peakDay.taskCount} tasks ·{' '}
        {workload.peakDay.minutes} minutes
      </p>
    </div>
  )}

  <div className="daily-load-list">
    {workload.days.slice(0, 5).map((day) => {
      const width = Math.min(
        100,
        (day.minutes / 240) * 100
      )

      return (
        <div className="daily-load" key={day.date}>
          <div>
            <span>
              {new Date(
                `${day.date}T00:00:00`
              ).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short'
              })}
            </span>

            <strong>{day.minutes}m</strong>
          </div>

          <div className="load-track">
            <div
              className={`load-fill ${day.level.toLowerCase()}`}
              style={{ width: `${width}%` }}
            ></div>
          </div>
        </div>
      )
    })}
  </div>
</aside>
      </section>

      {showForm && (
        <div className="modal-backdrop">
          <motion.div
            className="exam-modal"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
          >
            <div className="modal-header">
              <div>
                <p className="page-eyebrow">NEW TASK</p>
                <h2>Add task</h2>
              </div>

              <button
                className="modal-close"
                onClick={() => setShowForm(false)}
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={addTask}>
              <label>
                Task
                <input
                  type="text"
                  placeholder="Revise transaction schedules"
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  required
                />
              </label>

              <label>
                Subject
                <input
                  type="text"
                  placeholder="Database Systems"
                  value={subject}
                  onChange={(event) =>
                    setSubject(event.target.value)
                  }
                />
              </label>

              <label>
                Due date
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
                Priority
                <select
                  value={priority}
                  onChange={(event) =>
                    setPriority(event.target.value)
                  }
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
              </label>

              <label>
                Estimated minutes
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={duration}
                  onChange={(event) =>
                    setDuration(event.target.value)
                  }
                  required
                />
              </label>

              <button
                className="save-exam-button"
                type="submit"
              >
                Add task
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default Tasks