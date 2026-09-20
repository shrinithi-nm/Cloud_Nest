import {
  getAssignments,
  getStudents,
  saveAssignments
} from './adminData'

const SUBMISSIONS_KEY = 'cloudnest-admin-submissions'
const EXAM_RESULTS_KEY = 'cloudnest-admin-exam-results'

const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || []
  } catch {
    return []
  }
}

const write = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value))
}

export const getTargetStudents = (target) => {
  const students = getStudents()

  if (target === 'High Risk Students') {
    return students.filter(
      (student) => student.risk === 'High'
    )
  }

  if (target === 'Overloaded Students') {
    return students.filter(
      (student) => student.workload === 'Overloaded'
    )
  }

  return students
}

export const getSubmissions = () => read(SUBMISSIONS_KEY)

export const getSubmissionById = (submissionId) =>
  getSubmissions().find(
    (submission) => submission.id === submissionId
  )

export const initializeDemoSubmissions = () => {
  const existing = getSubmissions()

  if (existing.length > 0) {
    return existing
  }

  const assignments = getAssignments()
  const generated = []

  assignments.forEach((assignment, assignmentIndex) => {
    const targetStudents = getTargetStudents(
      assignment.target || 'All Students'
    )

    const submittedStudents = targetStudents.slice(
      0,
      Math.min(
        3 + assignmentIndex,
        targetStudents.length
      )
    )

    submittedStudents.forEach(
      (student, studentIndex) => {
        generated.push({
          id: `SUB-${assignment.id}-${student.id}`,
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          subject: assignment.subject,
          studentId: student.id,
          studentName: student.name,
          submittedAt: '2026-09-20',
          status:
            studentIndex === 0
              ? 'Graded'
              : 'Pending',
          marks:
            studentIndex === 0
              ? Math.round(
                  assignment.maxMarks * 0.8
                )
              : null,
          maxMarks: assignment.maxMarks,
          feedback:
            studentIndex === 0
              ? 'Good work. Review the weaker concepts before the next assessment.'
              : ''
        })
      }
    )
  })

  write(SUBMISSIONS_KEY, generated)

  return generated
}

export const gradeSubmission = (
  submissionId,
  marks,
  feedback
) => {
  const submissions = getSubmissions()

  const updated = submissions.map((submission) =>
    submission.id === submissionId
      ? {
          ...submission,
          marks: Number(marks),
          feedback: feedback.trim(),
          status: 'Graded',
          gradedAt: new Date().toISOString()
        }
      : submission
  )

  write(SUBMISSIONS_KEY, updated)

  const gradedSubmission = updated.find(
    (submission) =>
      submission.id === submissionId
  )

  if (gradedSubmission) {
    const assignments = getAssignments()

    const updatedAssignments = assignments.map(
      (assignment) => {
        if (
          assignment.id !==
          gradedSubmission.assignmentId
        ) {
          return assignment
        }

        const assignmentSubmissions = updated.filter(
          (submission) =>
            submission.assignmentId === assignment.id
        )

        return {
          ...assignment,
          submitted: assignmentSubmissions.length,
          graded: assignmentSubmissions.filter(
            (submission) =>
              submission.status === 'Graded'
          ).length
        }
      }
    )

    saveAssignments(updatedAssignments)
  }

  return gradedSubmission
}

export const getExamResults = () =>
  read(EXAM_RESULTS_KEY)

export const saveExamResult = (result) => {
  const results = getExamResults()

  const existingIndex = results.findIndex(
    (item) =>
      item.examId === result.examId &&
      item.studentId === result.studentId
  )

  if (existingIndex >= 0) {
    results[existingIndex] = {
      ...results[existingIndex],
      ...result
    }
  } else {
    results.push({
      id: `RESULT-${Date.now()}`,
      ...result
    })
  }

  write(EXAM_RESULTS_KEY, results)

  return result
}