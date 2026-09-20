const getLevel = (minutes) => {
  if (minutes > 180) {
    return 'Overloaded'
  }

  if (minutes > 120) {
    return 'Busy'
  }

  return 'Balanced'
}

export const analyzeWorkload = (tasks) => {
  const dailyMap = {}

  tasks
    .filter((task) => !task.completed && task.date)
    .forEach((task) => {
      if (!dailyMap[task.date]) {
        dailyMap[task.date] = {
          date: task.date,
          minutes: 0,
          taskCount: 0,
          tasks: []
        }
      }

      dailyMap[task.date].minutes += Number(task.duration) || 60
      dailyMap[task.date].taskCount += 1
      dailyMap[task.date].tasks.push(task)
    })

  const days = Object.values(dailyMap)
    .map((day) => ({
      ...day,
      level: getLevel(day.minutes)
    }))
    .sort(
      (a, b) =>
        new Date(`${a.date}T00:00:00`) -
        new Date(`${b.date}T00:00:00`)
    )

  const overloadedDays = days.filter(
    (day) => day.level === 'Overloaded'
  )

  const busyDays = days.filter(
    (day) => day.level === 'Busy'
  )

  const totalMinutes = days.reduce(
    (total, day) => total + day.minutes,
    0
  )

  const peakDay = days.reduce(
    (peak, day) =>
      !peak || day.minutes > peak.minutes ? day : peak,
    null
  )

  return {
    days,
    overloadedDays,
    busyDays,
    totalMinutes,
    peakDay
  }
}