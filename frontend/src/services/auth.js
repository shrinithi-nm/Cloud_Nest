const AUTH_KEY = 'cloudnest-auth'

export const login = (email, password, selectedRole) => {
  if (!email.trim() || !password.trim()) {
    return {
      success: false,
      message: 'Enter your email and password.'
    }
  }

  const session = {
    email: email.trim().toLowerCase(),
    role: selectedRole,
    name: selectedRole === 'admin' ? 'Administrator' : 'Student'
  }

  localStorage.setItem(AUTH_KEY, JSON.stringify(session))

  return {
    success: true,
    user: session
  }
}

export const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY))
  } catch {
    return null
  }
}

export const logout = () => {
  localStorage.removeItem(AUTH_KEY)
}

export const isAuthenticated = () => {
  return Boolean(getCurrentUser())
}

export const hasRole = (role) => {
  return getCurrentUser()?.role === role
}