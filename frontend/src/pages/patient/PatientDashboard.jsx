import { Link, useNavigate } from 'react-router-dom'
import { clearAuth } from '../../api/auth'
import { useProtectedProfile } from '../../api/useProtectedProfile'
import '../../components/ProfileAvatar.css'
import '../../components/AuthForm.css'
import './PatientDashboard.css'

function PatientDashboard() {
  const navigate = useNavigate()
  const { data: patient, error } = useProtectedProfile('patient')

  const handleLogout = () => {
    clearAuth('patient')
    navigate('/')
  }

  if (error) return <p>{error} — redirecting to login…</p>
  if (!patient) return <p>Loading…</p>

  return (
    <main className="dashboard-hub">
      <header className="dashboard-topbar">
        <span className="dashboard-brand">MaternIQ</span>
        <Link
          to="/patient/complete-profile"
          className="profile-avatar"
          title={patient.profile_completed ? 'Your profile' : 'Complete your profile'}
        >
          {patient.full_name.charAt(0).toUpperCase()}
          {!patient.profile_completed && <span className="profile-avatar-dot" />}
        </Link>
      </header>

      <h1>Welcome, {patient.full_name}</h1>
      <p>These two areas are kept separate — nothing in one affects the other.</p>

      <div className="dashboard-areas">
        <Link to="/patient/dashboard/lifestyle" className="dashboard-card">
          <h2>Lifestyle Companion</h2>
          <p>Your LLM-powered assistant for diet, exercise, and wellbeing guidance.</p>
        </Link>
        <Link to="/patient/dashboard/hospitals" className="dashboard-card">
          <h2>Hospital Management</h2>
          <p>Your wearable device, connected hospitals, and hospital directory.</p>
        </Link>
      </div>

      <button type="button" className="btn-secondary" onClick={handleLogout}>
        Log out
      </button>
    </main>
  )
}

export default PatientDashboard
