import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  BookOpen,
  Boxes,
  ClipboardCheck,
  Cloud,
  FileCheck2,
  Gauge,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  ShieldAlert,
  Users
} from 'lucide-react'

const sections = [
  {
    title: 'COMMAND',
    links: [
      {
        label: 'Command Center',
        path: '/admin',
        icon: LayoutDashboard,
        end: true
      }
    ]
  },
  {
    title: 'ACADEMIC OPS',
    links: [
      {
        label: 'Students',
        path: '/admin/students',
        icon: Users
      },
      {
        label: 'Subjects',
        path: '/admin/subjects',
        icon: BookOpen
      },
      {
        label: 'Assignments',
        path: '/admin/assignments',
        icon: ListChecks
      },
      {
        label: 'Exams',
        path: '/admin/exams',
        icon: FileCheck2
      },
      {
        label: 'Grading',
        path: '/admin/grading',
        icon: ClipboardCheck
      }
    ]
  },
  {
    title: 'INTELLIGENCE',
    links: [
      {
        label: 'Performance',
        path: '/admin/performance',
        icon: BarChart3
      },
      {
        label: 'At-Risk Students',
        path: '/admin/risk',
        icon: ShieldAlert
      },
      {
        label: 'Cohort Analytics',
        path: '/admin/cohort',
        icon: GraduationCap
      }
    ]
  },
  {
    title: 'CLOUD OPERATIONS',
    links: [
      {
        label: 'Infrastructure',
        path: '/admin/cloud',
        icon: Cloud
      },
      {
        label: 'Scaling',
        path: '/admin/scaling',
        icon: Boxes
      }
    ]
  }
]

function AdminSidebar() {
  return (
    <aside className="control-sidebar">
      <div className="control-brand">
        <div className="control-brand-icon">
          <Gauge size={23} />
        </div>

        <div>
          <strong>CloudNest</strong>
          <span>Control Plane</span>
        </div>
      </div>

      <div className="control-environment">
        <span className="control-live-dot"></span>

        <div>
          <strong>Platform online</strong>
          <span>Kubernetes environment</span>
        </div>
      </div>

      <nav className="control-navigation">
        {sections.map((section) => (
          <div
            className="control-nav-section"
            key={section.title}
          >
            <p>{section.title}</p>

            {section.links.map((link) => {
              const Icon = link.icon

              return (
                <NavLink
                  key={link.path}
                  to={link.path}
                  end={link.end}
                  className={({ isActive }) =>
                    `control-nav-link ${
                      isActive ? 'active' : ''
                    }`
                  }
                >
                  <Icon size={18} />
                  <span>{link.label}</span>
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}

export default AdminSidebar