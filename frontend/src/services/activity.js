export const getActivities = () => {
  return JSON.parse(
    localStorage.getItem('cloudnest-activities') || '[]'
  )
}

export const addActivity = ({
  type,
  title,
  description
}) => {
  const activities = getActivities()

  const activity = {
    id: `activity-${Date.now()}`,
    type,
    title,
    description,
    createdAt: new Date().toISOString()
  }

  localStorage.setItem(
    'cloudnest-activities',
    JSON.stringify([activity, ...activities].slice(0, 50))
  )

  return activity
}