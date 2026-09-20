import { Bell, LogOut, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { logout } from '../services/auth'

function Navbar() {
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="navbar">
      <div className="navbar-search">
        <Search size={18} />
        <input
          type="text"
          placeholder="Search CloudNest..."
        />
      </div>

      <div className="navbar-actions">
        <button
          type="button"
          className="icon-button"
          aria-label="Notifications"
        >
          <Bell size={19} />
        </button>

        <div className="profile">
          <div className="profile-avatar">P</div>

          <div className="profile-info">
            <strong>Student</strong>
            <span>CloudNest Workspace</span>
          </div>
        </div>

        <button
          type="button"
          className="student-logout-button"
          onClick={handleLogout}
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </header>
  )
}

export default Navbar