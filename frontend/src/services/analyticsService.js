import {
  getStudents,
  getSubjects
} from './adminData'

import {
  getSubmissions
} from './academicOperations'

export const getCohortAnalytics = () => {
  const students = getStudents()

  if (students.length === 0) {
    return {
      average: 0,
      completion: 0,
      improving: 0,
      declining: 0,
      highRisk: 0,
      mediumRisk: 0,
      lowRisk: 0,
      overloaded: 0
    }
  }

  const average =
    students.reduce(
      (total, student) => total + student.average,
      0
    ) / students.length

  const completion =
    students.reduce(
      (total, student) => total + student.completion,
      0
    ) / students.length

  return {
    average: Number(average.toFixed(1)),
    completion: Number(completion.toFixed(1)),
    improving: students.filter(
      (student) => student.growth > 0
    ).length,
    declining: students.filter(
      (student) => student.growth < 0
    ).length,
    highRisk: students.filter(
      (student) => student.risk === 'High'
    ).length,
    mediumRisk: students.filter(
      (student) => student.risk === 'Medium'
    ).length,
    lowRisk: students.filter(
      (student) => student.risk === 'Low'
    ).length,
    overloaded: students.filter(
      (student) =>
        student.workload === 'Overloaded'
    ).length
  }
}

export const getRiskStudents = () => {
  const students = getStudents()

  return students
    .filter(
      (student) =>
        student.risk === 'High' ||
        student.risk === 'Medium'
    )
    .map((student) => {
      const reasons = []

      if (student.average < 70) {
        reasons.push('Low academic average')
      }

      if (student.growth < 0) {
        reasons.push('Declining performance')
      }

      if (student.completion < 65) {
        reasons.push('Low task completion')
      }

      if (student.workload === 'Overloaded') {
        reasons.push('Workload overload')
      }

      return {
        ...student,
        reasons
      }
    })
    .sort((a, b) => {
      const priority = {
        High: 3,
        Medium: 2,
        Low: 1
      }

      return priority[b.risk] - priority[a.risk]
    })
}

export const getPerformanceRanking = () => {
  return [...getStudents()].sort(
    (a, b) => b.average - a.average
  )
}

export const getGrowthRanking = () => {
  return [...getStudents()].sort(
    (a, b) => b.growth - a.growth
  )
}

export const getSubjectAnalytics = () => {
  const subjects = getSubjects()
  const submissions = getSubmissions()

  return subjects.map((subject) => {
    const subjectSubmissions = submissions.filter(
      (submission) =>
        submission.subject === subject.name &&
        submission.status === 'Graded'
    )

    const gradedAverage =
      subjectSubmissions.length === 0
        ? null
        : subjectSubmissions.reduce(
            (total, submission) =>
              total +
              (submission.marks /
                submission.maxMarks) *
                100,
            0
          ) / subjectSubmissions.length

    return {
      ...subject,
      gradedSubmissions: subjectSubmissions.length,
      gradedAverage:
        gradedAverage === null
          ? null
          : Number(gradedAverage.toFixed(1))
    }
  })
}

export const getGradingAnalytics = () => {
  const submissions = getSubmissions()

  const graded = submissions.filter(
    (submission) => submission.status === 'Graded'
  )

  const pending = submissions.filter(
    (submission) => submission.status === 'Pending'
  )

  return {
    total: submissions.length,
    graded: graded.length,
    pending: pending.length,
    completion:
      submissions.length === 0
        ? 0
        : Number(
            (
              (graded.length / submissions.length) *
              100
            ).toFixed(1)
          )
  }
}