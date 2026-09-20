import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  GraduationCap,
  CalendarDays,
  ListTodo,
  Calendar,
  FolderOpen,
  TrendingUp,
  Activity,
  ShieldCheck,
  Cloud
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Academics', path: '/academics', icon: GraduationCap },
  { name: 'Exams', path: '/exams', icon: CalendarDays },
  { name: 'Tasks', path: '/tasks', icon: ListTodo },
  { name: 'Calendar', path: '/calendar', icon: Calendar },
  { name: 'Vault', path: '/vault', icon: FolderOpen },
  { name: 'Progress', path: '/progress', icon: TrendingUp },
  { name: 'Cloud Pulse', path: '/cloud', icon: Activity },
  { name: 'Admin', path: '/admin', icon: ShieldCheck }
]

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <Cloud size={23} />
        </div>

        <div>
          <h1>CloudNest</h1>
          <span>Academic Cloud</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <p className="nav-label">WORKSPACE</p>

        {navigation.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={19} />
              <span>{item.name}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="sidebar-status">
        <div className="status-dot"></div>
        <div>
          <strong>Cloud systems</strong>
          <span>Runtime ready</span>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar