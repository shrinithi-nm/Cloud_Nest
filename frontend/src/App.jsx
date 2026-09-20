import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Academics from './pages/Academics'
import Exams from './pages/Exams'
import Tasks from './pages/Tasks'
import Calendar from './pages/Calendar'
import Vault from './pages/Vault'
import Progress from './pages/Progress'
import CloudPulse from './pages/CloudPulse'
import Admin from './pages/Admin'
import MainLayout from './layouts/MainLayout'
import Roadmap from './pages/Roadmap'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<Login />} />

      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/academics" element={<Academics />} />
        <Route path="/exams" element={<Exams />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/vault" element={<Vault />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/cloud" element={<CloudPulse />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/roadmap/:examId" element={<Roadmap />} />
      </Route>
    </Routes>
  )
}

export default App