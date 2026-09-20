const formatDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const addDays = (date, days) => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

const distributeIndexes = (count, start, end) => {
  if (count <= 0) return []
  if (count === 1) return [Math.round((start + end) / 2)]

  const indexes = []

  for (let index = 0; index < count; index += 1) {
    indexes.push(
      Math.round(start + ((end - start) * index) / (count - 1))
    )
  }

  return indexes
}

export const generateRoadmap = (exam) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const examDate = new Date(`${exam.date}T00:00:00`)
  examDate.setHours(0, 0, 0, 0)

  const lastStudyDate = addDays(examDate, -1)

  const totalAvailableDays = Math.ceil(
    (examDate - today) / 86400000
  )

  if (totalAvailableDays <= 0 || !exam.syllabus?.length) {
    return {
      sessions: [],
      availableDays: Math.max(0, totalAvailableDays),
      totalMinutes: 0,
      revisionSessions: 0
    }
  }

  const topics = exam.syllabus
  const availableIndexes = Array.from(
    { length: totalAvailableDays },
    (_, index) => index
  )

  const reserveRevisionDays =
    totalAvailableDays >= 10
      ? Math.min(3, Math.max(1, Math.floor(totalAvailableDays * 0.2)))
      : totalAvailableDays >= 5
        ? 2
        : 1

  const maximumLearningIndex = Math.max(
    0,
    totalAvailableDays - reserveRevisionDays - 1
  )

  const learningIndexes = distributeIndexes(
    topics.length,
    0,
    maximumLearningIndex
  )

  const learningSessions = topics.map((topic, index) => {
    const isHighPriority =
      index === Math.floor(topics.length / 2) ||
      index === topics.length - 1

    return {
      id: `${exam.id}-learn-${index}`,
      examId: exam.id,
      subject: exam.subject,
      date: formatDate(addDays(today, learningIndexes[index])),
      title: topic,
      topics: [topic],
      phase:
        index < Math.ceil(topics.length * 0.35)
          ? 'Foundation'
          : 'Core Preparation',
      type: 'Study',
      activity:
        index % 2 === 0
          ? 'Concept learning + active recall'
          : 'Concept learning + practice',
      duration: isHighPriority ? 90 : 60,
      priority: isHighPriority ? 'High' : 'Medium',
      completed: false
    }
  })

  const revisionStartIndex = Math.min(
    totalAvailableDays - 1,
    maximumLearningIndex + 1
  )

  const revisionIndexes = distributeIndexes(
    reserveRevisionDays,
    revisionStartIndex,
    totalAvailableDays - 1
  )

  const revisionSessions = revisionIndexes.map((dayIndex, index) => {
    const isFinal = index === revisionIndexes.length - 1

    let selectedTopics = topics

    if (!isFinal && topics.length > 3) {
      const midpoint = Math.ceil(topics.length / 2)

      selectedTopics =
        index % 2 === 0
          ? topics.slice(0, midpoint)
          : topics.slice(midpoint)
    }

    return {
      id: `${exam.id}-revision-${index}`,
      examId: exam.id,
      subject: exam.subject,
      date: formatDate(
        dayIndex === totalAvailableDays - 1
          ? lastStudyDate
          : addDays(today, dayIndex)
      ),
      title: isFinal
        ? 'Final Revision'
        : `Revision Cycle ${index + 1}`,
      topics: selectedTopics,
      phase: 'Revision',
      type: isFinal ? 'Final Revision' : 'Revision',
      activity: isFinal
        ? 'Quick recall + weak-topic review'
        : 'Active recall + practice',
      duration: isFinal ? 90 : 75,
      priority: 'High',
      completed: false
    }
  })

  const sessions = [...learningSessions, ...revisionSessions]
    .sort((first, second) => {
      return new Date(first.date) - new Date(second.date)
    })

  const uniqueSessions = sessions.map((session, index) => ({
    ...session,
    sequence: index + 1
  }))

  const totalMinutes = uniqueSessions.reduce(
    (total, session) => total + session.duration,
    0
  )

  return {
    sessions: uniqueSessions,
    availableDays: availableIndexes.length,
    totalMinutes,
    revisionSessions: revisionSessions.length
  }
}