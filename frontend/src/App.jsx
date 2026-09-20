import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Academics from './pages/Academics'
import Exams from './pages/Exams'
import Tasks from './pages/Tasks'
import Calendar from './pages/Calendar'
import Vault from './pages/Vault'
import Progress from './pages/Progress'
import Roadmap from './pages/Roadmap'
import CloudPulse from './pages/CloudPulse'
import MainLayout from './layouts/MainLayout'
import AdminLayout from './layouts/AdminLayout'
import ProtectedRoute from './components/ProtectedRoute'
import CommandCenter from './pages/admin/CommandCenter'
import StudentsAdmin from './pages/admin/StudentsAdmin'
import StudentDetail from './pages/admin/StudentDetail'
import SubjectsAdmin from './pages/admin/SubjectsAdmin'
import SubjectDetail from './pages/admin/SubjectDetail'
import AssignmentsAdmin from './pages/admin/AssignmentsAdmin'
import AssignmentDetail from './pages/admin/AssignmentDetail'
import GradingAdmin from './pages/admin/GradingAdmin'
import GradeSubmission from './pages/admin/GradeSubmission'
import ExamsAdmin from './pages/admin/ExamsAdmin'
import ExamDetail from './pages/admin/ExamDetail'
import PerformanceAdmin from './pages/admin/PerformanceAdmin'
import RiskAdmin from './pages/admin/RiskAdmin'
import CohortAdmin from './pages/admin/CohortAdmin'

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute allowedRoles={['student']} />
        }
      >
        <Route element={<MainLayout />}>
          <Route
            path="/dashboard"
            element={<Dashboard />}
          />
          <Route
            path="/academics"
            element={<Academics />}
          />
          <Route
            path="/exams"
            element={<Exams />}
          />
          <Route
            path="/tasks"
            element={<Tasks />}
          />
          <Route
            path="/calendar"
            element={<Calendar />}
          />
          <Route
            path="/vault"
            element={<Vault />}
          />
          <Route
            path="/progress"
            element={<Progress />}
          />
          <Route
            path="/roadmap/:examId"
            element={<Roadmap />}
          />
        </Route>
      </Route>

      <Route
        element={
          <ProtectedRoute allowedRoles={['admin']} />
        }
      >
        <Route element={<AdminLayout />}>
          <Route
            path="/admin"
            element={<CommandCenter />}
          />

          <Route
            path="/admin/students"
            element={<StudentsAdmin />}
          />

          <Route
            path="/admin/students/:studentId"
            element={<StudentDetail />}
          />

          <Route
            path="/admin/subjects"
            element={<SubjectsAdmin />}
          />

          <Route
            path="/admin/subjects/:subjectId"
            element={<SubjectDetail />}
          />

          <Route
            path="/admin/assignments"
            element={<AssignmentsAdmin />}
          />

          <Route
            path="/admin/assignments/:assignmentId"
            element={<AssignmentDetail />}
          />

          <Route
            path="/admin/grading"
            element={<GradingAdmin />}
          />

          <Route
            path="/admin/grading/:submissionId"
            element={<GradeSubmission />}
          />

          <Route
            path="/admin/exams"
            element={<ExamsAdmin />}
          />

          <Route
            path="/admin/exams/:examId"
            element={<ExamDetail />}
          />

          <Route
            path="/admin/performance"
            element={<PerformanceAdmin />}
          />

          <Route
            path="/admin/risk"
            element={<RiskAdmin />}
          />

          <Route
            path="/admin/cohort"
            element={<CohortAdmin />}
          />

          <Route
            path="/admin/cloud"
            element={<CloudPulse />}
          />
        </Route>
      </Route>

      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />
    </Routes>
  )
}

export default App