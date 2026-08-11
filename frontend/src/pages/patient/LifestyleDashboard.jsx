import { Link } from 'react-router-dom'
import { useRequireAuth } from '../../api/useRequireAuth'

function LifestyleDashboard() {
  useRequireAuth('patient')

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '2rem 1rem' }}>
      <Link to="/patient/dashboard">Back to dashboard</Link>
      <h1>Lifestyle Companion</h1>
      <p>The LLM assistant (diet, exercise, wellbeing chat) is built in Phase 4.</p>
    </main>
  )
}

export default LifestyleDashboard
