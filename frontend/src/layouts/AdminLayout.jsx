import { Outlet } from 'react-router-dom'
import { motion } from 'motion/react'
import AdminSidebar from '../components/admin/AdminSidebar'
import AdminNavbar from '../components/admin/AdminNavbar'

function AdminLayout() {
  return (
    <div className="admin-shell">
      <AdminSidebar />

      <div className="admin-app-area">
        <AdminNavbar />

        <main className="admin-main-content">
          <motion.div
            className="admin-page-container"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}

export default AdminLayout