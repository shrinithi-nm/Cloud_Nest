import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListTodo
} from 'lucide-react'
import { analyzeWorkload } from '../services/workload'

function Calendar() {
  const [tasks, setTasks] = useState(() =>
    JSON.parse(localStorage.getItem('cloudnest-tasks') || '[]')
  )

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date()
    return formatDate(now)
  })

  const workload = useMemo(
    () => analyzeWorkload(tasks),
    [tasks]
  )

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const calendarCells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1)
  ]

  while (calendarCells.length % 7 !== 0) {
    calendarCells.push(null)
  }

  const selectedTasks = tasks
    .filter((task) => task.date === selectedDate)
    .sort((a, b) => {
      if (a.completed !== b.completed) {
        return Number(a.completed) - Number(b.completed)
      }

      return (b.duration || 0) - (a.duration || 0)
    })

  const selectedLoad = workload.days.find(
    (day) => day.date === selectedDate
  )

  const changeMonth = (offset) => {
    setCurrentMonth(
      new Date(year, month + offset, 1)
    )
  }

  const selectDay = (day) => {
    setSelectedDate(
      formatDate(new Date(year, month, day))
    )
  }

  const toggleTask = (id) => {
    setTasks((current) => {
      const updated = current.map((task) =>
        task.id === id
          ? {
              ...task,
              completed: !task.completed
            }
          : task
      )

      localStorage.setItem(
        'cloudnest-tasks',
        JSON.stringify(updated)
      )

      return updated
    })
  }

  const goToToday = () => {
    const now = new Date()

    setCurrentMonth(
      new Date(now.getFullYear(), now.getMonth(), 1)
    )

    setSelectedDate(formatDate(now))
  }

  return (
    <div>
      <section className="calendar-page-header">
        <div>
          <p className="page-eyebrow">ACADEMIC PLANNER</p>
          <h1 className="page-title">Calendar</h1>
          <p className="page-description">
            See study sessions, deadlines and workload collisions
            across your academic month.
          </p>
        </div>

        <button
          className="calendar-today-button"
          onClick={goToToday}
        >
          <CalendarDays size={16} />
          Today
        </button>
      </section>

      <section className="calendar-workspace">
        <motion.div
          className="calendar-panel card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="calendar-controls">
            <div>
              <p className="section-kicker">MONTHLY PLAN</p>
              <h2>
                {currentMonth.toLocaleDateString('en-IN', {
                  month: 'long',
                  year: 'numeric'
                })}
              </h2>
            </div>

            <div className="month-buttons">
              <button onClick={() => changeMonth(-1)}>
                <ChevronLeft size={18} />
              </button>

              <button onClick={() => changeMonth(1)}>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="calendar-weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
              (day) => (
                <span key={day}>{day}</span>
              )
            )}
          </div>

          <div className="calendar-grid">
            {calendarCells.map((day, index) => {
              if (!day) {
                return (
                  <div
                    className="calendar-cell empty"
                    key={`empty-${index}`}
                  ></div>
                )
              }

              const dateKey = formatDate(
                new Date(year, month, day)
              )

              const dayTasks = tasks.filter(
                (task) => task.date === dateKey
              )

              const dayLoad = workload.days.find(
                (item) => item.date === dateKey
              )

              const isSelected = selectedDate === dateKey
              const isToday = dateKey === formatDate(new Date())

              return (
                <button
                  className={`calendar-cell ${
                    isSelected ? 'selected' : ''
                  } ${isToday ? 'current-day' : ''}`}
                  key={dateKey}
                  onClick={() => selectDay(day)}
                >
                  <div className="calendar-date-row">
                    <span>{day}</span>

                    {dayLoad && (
                      <span
                        className={`load-dot ${dayLoad.level.toLowerCase()}`}
                      ></span>
                    )}
                  </div>

                  <div className="calendar-events">
                    {dayTasks.slice(0, 2).map((task) => (
                      <div
                        className={`calendar-event ${
                          task.completed ? 'completed' : ''
                        }`}
                        key={task.id}
                      >
                        {task.title}
                      </div>
                    ))}

                    {dayTasks.length > 2 && (
                      <span className="more-events">
                        +{dayTasks.length - 2} more
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="calendar-legend">
            <span>
              <i className="legend-dot balanced"></i>
              Balanced
            </span>

            <span>
              <i className="legend-dot busy"></i>
              Busy
            </span>

            <span>
              <i className="legend-dot overloaded"></i>
              Overloaded
            </span>
          </div>
        </motion.div>

        <aside className="day-agenda card">
          <p className="section-kicker">DAY AGENDA</p>

          <h2>
            {new Date(
              `${selectedDate}T00:00:00`
            ).toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            })}
          </h2>

          {selectedLoad && (
            <div
              className={`day-load-card ${selectedLoad.level.toLowerCase()}`}
            >
              <div>
                <span>WORKLOAD</span>
                <strong>{selectedLoad.level}</strong>
              </div>

              <div>
                <strong>{selectedLoad.minutes}m</strong>
                <span>planned</span>
              </div>
            </div>
          )}

          <div className="agenda-list">
            {selectedTasks.length === 0 ? (
              <div className="agenda-empty">
                <CalendarDays size={23} />
                <strong>Clear day</strong>
                <p>No tasks are scheduled for this date.</p>
              </div>
            ) : (
              selectedTasks.map((task) => (
                <div
                  className={`agenda-task ${
                    task.completed ? 'completed' : ''
                  }`}
                  key={task.id}
                >
                  <button
                    className={`agenda-check ${
                      task.completed ? 'checked' : ''
                    }`}
                    onClick={() => toggleTask(task.id)}
                  >
                    {task.completed && <Check size={13} />}
                  </button>

                  <div>
                    <span>{task.subject}</span>
                    <strong>{task.title}</strong>

                    <p>
                      <Clock3 size={12} />
                      {task.duration || 60} min
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="agenda-summary">
            <ListTodo size={15} />
            <span>
              {selectedTasks.length}{' '}
              {selectedTasks.length === 1 ? 'task' : 'tasks'} scheduled
            </span>
          </div>
        </aside>
      </section>
    </div>
  )
}

const formatDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export default Calendar