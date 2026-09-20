import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  Cloud,
  ShieldCheck,
  Sparkles
} from 'lucide-react'
import { getCurrentUser, login } from '../services/auth'

function Login() {
  const navigate = useNavigate()
  const currentUser = getCurrentUser()

  const [role, setRole] = useState('student')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (currentUser) {
    return (
      <Navigate
        to={currentUser.role === 'admin' ? '/admin' : '/dashboard'}
        replace
      />
    )
  }

  const selectRole = (nextRole) => {
    setRole(nextRole)
    setError('')

    if (nextRole === 'admin') {
      setEmail('admin@cloudnest.edu')
      setPassword('admin123')
      return
    }

    setEmail('student@cloudnest.edu')
    setPassword('student123')
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setError('')

    const result = login(email, password, role)

    if (!result.success) {
      setError(result.message)
      return
    }

    navigate(role === 'admin' ? '/admin' : '/dashboard', {
      replace: true
    })
  }

  return (
    <div className="login-page">
      <motion.section
        className="login-showcase"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="login-brand">
          <div className="brand-icon">
            <Cloud size={23} />
          </div>

          <div>
            <strong>CloudNest</strong>
            <span>Academic Cloud</span>
          </div>
        </div>

        <div className="showcase-content">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <p className="login-eyebrow">
              <Sparkles size={14} />
              CLOUD-NATIVE ACADEMIC PLATFORM
            </p>

            <h1>
              Plan smarter.
              <br />
              Learn with clarity.
            </h1>

            <p className="showcase-description">
              One intelligent workspace for academic management, adaptive
              planning, student progress and cloud-powered operations.
            </p>
          </motion.div>

          <div className="login-features">
            <div>
              <BookOpen size={18} />
              <span>Academic intelligence</span>
            </div>

            <div>
              <CalendarCheck size={18} />
              <span>Adaptive planning</span>
            </div>

            <div>
              <ShieldCheck size={18} />
              <span>Role-based workspace</span>
            </div>
          </div>
        </div>

        <p className="login-footer">CloudNest Academic Platform</p>
      </motion.section>

      <section className="login-form-area">
        <motion.div
          className="login-form-wrapper"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
        >
          <p className="form-eyebrow">WELCOME BACK</p>
          <h2>Sign in to CloudNest</h2>
          <p className="form-description">
            Choose your workspace and continue securely.
          </p>

          <div className="role-switcher">
            <button
              type="button"
              className={role === 'student' ? 'selected' : ''}
              onClick={() => selectRole('student')}
            >
              Student
            </button>

            <button
              type="button"
              className={role === 'admin' ? 'selected' : ''}
              onClick={() => selectRole('admin')}
            >
              Admin
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <label>
              Email address
              <input
                type="email"
                placeholder={`${role}@cloudnest.edu`}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {error && <p className="login-error">{error}</p>}

            <button className="login-button" type="submit">
              Continue to {role === 'admin' ? 'admin' : 'student'} workspace
              <ArrowRight size={17} />
            </button>
          </form>

          <div className="demo-credentials">
            <strong>Demo {role} account</strong>
            <span>
              {role === 'admin'
                ? 'admin@cloudnest.edu · admin123'
                : 'student@cloudnest.edu · student123'}
            </span>
          </div>
        </motion.div>
      </section>
    </div>
  )
}

export default Login