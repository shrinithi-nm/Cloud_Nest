import { useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronDown,
  LogOut,
  Search,
  ShieldCheck
} from 'lucide-react'
import { getCurrentUser, logout } from '../../services/auth'

function AdminNavbar() {
  const navigate = useNavigate()
  const user = getCurrentUser()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="control-navbar">
      <div className="control-search">
        <Search size={18} />
        <input
          type="text"
          placeholder="Search students, exams, assignments..."
        />
      </div>

      <div className="control-navbar-actions">
        <div className="control-cluster-badge">
          <span></span>
          Cluster operational
        </div>

        <button
          type="button"
          className="control-icon-button"
          aria-label="Notifications"
        >
          <Bell size={19} />
        </button>

        <div className="control-profile">
          <div className="control-avatar">
            <ShieldCheck size={19} />
          </div>

          <div>
            <strong>{user?.name || 'Administrator'}</strong>
            <span>Platform Administrator</span>
          </div>

          <ChevronDown size={16} />
        </div>

        <button
          type="button"
          className="control-logout"
          onClick={handleLogout}
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </header>
  )
}

export default AdminNavbar