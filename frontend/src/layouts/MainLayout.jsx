import { Outlet } from 'react-router-dom'
import { motion, MotionConfig } from 'motion/react'
import { usePreferences } from '../components/preferenceContext'
import '../pages/Settings.css'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'

function MainLayout() {
  const { preferences } = usePreferences()
  return (
    <MotionConfig reducedMotion="user"><div className={`app-shell personal-workspace prefs-theme-${preferences.theme}`}>
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
    </div></MotionConfig>
  )
}

export default MainLayout