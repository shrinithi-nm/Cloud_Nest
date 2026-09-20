import { Bell, Search } from 'lucide-react'

function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-search">
        <Search size={18} />
        <input type="text" placeholder="Search CloudNest..." />
      </div>

      <div className="navbar-actions">
        <button className="icon-button">
          <Bell size={19} />
        </button>

        <div className="profile">
          <div className="profile-avatar">P</div>

          <div className="profile-info">
            <strong>Student</strong>
            <span>CloudNest Workspace</span>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Navbar