import { Navigate, Outlet } from 'react-router-dom'
import { getCurrentUser } from '../services/auth'

function ProtectedRoute({ allowedRoles }) {
  const user = getCurrentUser()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const destination =
      user.role === 'admin' ? '/admin' : '/dashboard'

    return <Navigate to={destination} replace />
  }

  return <Outlet />
}

export default ProtectedRoute