const STUDENTS_KEY = 'cloudnest-admin-students'
const SUBJECTS_KEY = 'cloudnest-admin-subjects'
const ASSIGNMENTS_KEY = 'cloudnest-admin-assignments'
const EXAMS_KEY = 'cloudnest-admin-exams'

const defaultStudents = [
  {
    id: 'STU001',
    name: 'Aarav Sharma',
    email: 'aarav@cloudnest.edu',
    average: 86,
    growth: 8,
    completion: 91,
    workload: 'Balanced',
    risk: 'Low',
    status: 'Active'
  },
  {
    id: 'STU002',
    name: 'Diya Nair',
    email: 'diya@cloudnest.edu',
    average: 91,
    growth: 11,
    completion: 94,
    workload: 'Balanced',
    risk: 'Low',
    status: 'Active'
  },
  {
    id: 'STU003',
    name: 'Rahul Verma',
    email: 'rahul@cloudnest.edu',
    average: 61,
    growth: -7,
    completion: 48,
    workload: 'Overloaded',
    risk: 'High',
    status: 'Active'
  },
  {
    id: 'STU004',
    name: 'Ananya Rao',
    email: 'ananya@cloudnest.edu',
    average: 78,
    growth: 3,
    completion: 76,
    workload: 'Busy',
    risk: 'Medium',
    status: 'Active'
  },
  {
    id: 'STU005',
    name: 'Ishaan Patel',
    email: 'ishaan@cloudnest.edu',
    average: 72,
    growth: -2,
    completion: 69,
    workload: 'Busy',
    risk: 'Medium',
    status: 'Active'
  },
  {
    id: 'STU006',
    name: 'Meera Iyer',
    email: 'meera@cloudnest.edu',
    average: 88,
    growth: 9,
    completion: 92,
    workload: 'Balanced',
    risk: 'Low',
    status: 'Active'
  },
  {
    id: 'STU007',
    name: 'Arjun Menon',
    email: 'arjun@cloudnest.edu',
    average: 67,
    growth: -4,
    completion: 58,
    workload: 'Overloaded',
    risk: 'High',
    status: 'Active'
  },
  {
    id: 'STU008',
    name: 'Kavya Singh',
    email: 'kavya@cloudnest.edu',
    average: 82,
    growth: 6,
    completion: 85,
    workload: 'Balanced',
    risk: 'Low',
    status: 'Active'
  }
]

const defaultSubjects = [
  {
    id: 'SUB001',
    code: 'DBMS',
    name: 'Database Systems',
    students: 96,
    average: 74
  },
  {
    id: 'SUB002',
    code: 'OS',
    name: 'Operating Systems',
    students: 94,
    average: 71
  },
  {
    id: 'SUB003',
    code: 'CN',
    name: 'Computer Networks',
    students: 91,
    average: 79
  },
  {
    id: 'SUB004',
    code: 'CC',
    name: 'Cloud Computing',
    students: 96,
    average: 83
  },
  {
    id: 'SUB005',
    code: 'DAA',
    name: 'Design and Analysis of Algorithms',
    students: 89,
    average: 69
  }
]

const defaultAssignments = [
  {
    id: 'ASN001',
    title: 'Normalization Worksheet',
    subject: 'Database Systems',
    deadline: '2026-09-24',
    maxMarks: 20,
    assigned: 96,
    submitted: 82,
    graded: 61,
    status: 'Active'
  },
  {
    id: 'ASN002',
    title: 'Process Scheduling Analysis',
    subject: 'Operating Systems',
    deadline: '2026-09-26',
    maxMarks: 25,
    assigned: 94,
    submitted: 71,
    graded: 48,
    status: 'Active'
  },
  {
    id: 'ASN003',
    title: 'Kubernetes Deployment Lab',
    subject: 'Cloud Computing',
    deadline: '2026-09-29',
    maxMarks: 30,
    assigned: 96,
    submitted: 54,
    graded: 31,
    status: 'Active'
  }
]

const defaultExams = [
  {
    id: 'EXM001',
    title: 'Database Systems FAT',
    subject: 'Database Systems',
    date: '2026-10-15',
    maxMarks: 100,
    students: 96,
    status: 'Published'
  },
  {
    id: 'EXM002',
    title: 'Operating Systems CAT',
    subject: 'Operating Systems',
    date: '2026-10-04',
    maxMarks: 50,
    students: 94,
    status: 'Published'
  }
]

const initialize = (key, fallback) => {
  const existing = localStorage.getItem(key)

  if (!existing) {
    localStorage.setItem(key, JSON.stringify(fallback))
    return fallback
  }

  try {
    return JSON.parse(existing)
  } catch {
    localStorage.setItem(key, JSON.stringify(fallback))
    return fallback
  }
}

export const getStudents = () =>
  initialize(STUDENTS_KEY, defaultStudents)

export const getSubjects = () =>
  initialize(SUBJECTS_KEY, defaultSubjects)

export const getAssignments = () =>
  initialize(ASSIGNMENTS_KEY, defaultAssignments)

export const getAdminExams = () =>
  initialize(EXAMS_KEY, defaultExams)

export const getStudentById = (studentId) =>
  getStudents().find((student) => student.id === studentId)

export const saveStudents = (students) => {
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(students))
}

export const saveSubjects = (subjects) => {
  localStorage.setItem(SUBJECTS_KEY, JSON.stringify(subjects))
}

export const saveAssignments = (assignments) => {
  localStorage.setItem(
    ASSIGNMENTS_KEY,
    JSON.stringify(assignments)
  )
}

export const saveAdminExams = (exams) => {
  localStorage.setItem(EXAMS_KEY, JSON.stringify(exams))
}

export const createAssignment = (assignment) => {
  const assignments = getAssignments()

  const created = {
    id: `ASN${Date.now()}`,
    submitted: 0,
    graded: 0,
    status: 'Active',
    ...assignment
  }

  saveAssignments([created, ...assignments])

  return created
}

export const createAdminExam = (exam) => {
  const exams = getAdminExams()

  const created = {
    id: `EXM${Date.now()}`,
    status: 'Published',
    ...exam
  }

  saveAdminExams([created, ...exams])

  return created
}

export const getAdminSummary = () => {
  const students = getStudents()
  const subjects = getSubjects()
  const assignments = getAssignments()
  const exams = getAdminExams()

  const average =
    students.length === 0
      ? 0
      : students.reduce(
          (total, student) => total + student.average,
          0
        ) / students.length

  const improving = students.filter(
    (student) => student.growth > 0
  ).length

  const atRisk = students.filter(
    (student) => student.risk === 'High'
  ).length

  const overloaded = students.filter(
    (student) => student.workload === 'Overloaded'
  ).length

  const awaitingGrading = assignments.reduce(
    (total, assignment) =>
      total + Math.max(assignment.submitted - assignment.graded, 0),
    0
  )

  return {
    studentCount: students.length,
    subjectCount: subjects.length,
    assignmentCount: assignments.length,
    examCount: exams.length,
    average: Number(average.toFixed(1)),
    improving,
    atRisk,
    overloaded,
    awaitingGrading
  }
}
export const updateAdminExam = (examId, updates) => {
  const exams = getAdminExams()

  const updatedExams = exams.map((exam) =>
    exam.id === examId
      ? {
          ...exam,
          ...updates
        }
      : exam
  )

  saveAdminExams(updatedExams)

  return updatedExams.find(
    (exam) => exam.id === examId
  )
}
