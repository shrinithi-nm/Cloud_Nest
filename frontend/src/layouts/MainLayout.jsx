import { Outlet } from 'react-router-dom'
import { motion } from 'motion/react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'

function MainLayout() {
  return (
    <div className="app-shell">
      <Sidebar />

      <div className="app-area">
        <Navbar />

        <main className="main-content">
          <motion.div
            className="page-container"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}

export default MainLayout