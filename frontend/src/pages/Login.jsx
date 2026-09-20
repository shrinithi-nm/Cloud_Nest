import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  Cloud,
  ShieldCheck,
  Sparkles
} from 'lucide-react'

function Login() {
  const navigate = useNavigate()
  const [role, setRole] = useState('student')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()

    if (role === 'admin') {
      navigate('/admin')
      return
    }

    navigate('/dashboard')
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
              YOUR ACADEMIC WORKSPACE
            </p>

            <h1>
              Plan smarter.
              <br />
              Learn with clarity.
            </h1>

            <p className="showcase-description">
              One intelligent workspace for academics, exams, tasks, progress
              and your cloud-powered student workflow.
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
              <span>Secure workspace</span>
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
            Continue to your academic workspace.
          </p>

          <div className="role-switcher">
            <button
              type="button"
              className={role === 'student' ? 'selected' : ''}
              onClick={() => setRole('student')}
            >
              Student
            </button>

            <button
              type="button"
              className={role === 'admin' ? 'selected' : ''}
              onClick={() => setRole('admin')}
            >
              Admin
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <label>
              Email address
              <input
                type="email"
                placeholder="student@cloudnest.edu"
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

            <button className="login-button" type="submit">
              Continue to workspace
              <ArrowRight size={17} />
            </button>
          </form>

          <p className="demo-message">
            MVP access accepts any valid email and password.
          </p>
        </motion.div>
      </section>
    </div>
  )
}

export default Login