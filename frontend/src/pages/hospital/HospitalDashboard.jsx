import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../../api/config'
import { clearAuth, getToken } from '../../api/auth'
import { useProtectedProfile } from '../../api/useProtectedProfile'
import '../../components/AuthForm.css'
import '../../components/ProfileAvatar.css'
import './HospitalDashboard.css'

function HospitalDashboard() {
  const navigate = useNavigate()
  const { data: hospital, error } = useProtectedProfile('hospital')

  // --- Phase 2 ---
  const [doctorCount, setDoctorCount] = useState(null)
  const [patientCount, setPatientCount] = useState(null)

  // --- Phase 2 ---
  useEffect(() => {
    if (!hospital) return

    fetch(`${API_BASE_URL}/api/hospital/doctors`, {
      headers: { Authorization: `Bearer ${getToken('hospital')}` },
    })
      .then((response) => response.json())
      .then((data) => setDoctorCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setDoctorCount(0))

    fetch(`${API_BASE_URL}/api/hospital/patients`, {
      headers: { Authorization: `Bearer ${getToken('hospital')}` },
    })
      .then((response) => response.json())
      .then((data) => setPatientCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setPatientCount(0))
  }, [hospital])

  const handleLogout = () => {
    clearAuth('hospital')
    navigate('/')
  }

  if (error) return <p>{error} — redirecting to login…</p>
  if (!hospital) return <p>Loading…</p>

  return (
    <main className="dashboard-hub">
      <header className="dashboard-topbar">
        <span className="dashboard-brand">MaternIQ</span>
        <Link to="/hospital/profile" className="profile-avatar" title="Hospital profile">
          {hospital.name.charAt(0).toUpperCase()}
        </Link>
      </header>

      <h1>Welcome, {hospital.name}</h1>

      <div className="dashboard-areas">
        <Link to="/hospital/dashboard/doctors" className="dashboard-card">
          <h2>My Doctors</h2>
          <p>{doctorCount === null ? 'Loading…' : `${doctorCount} doctor${doctorCount === 1 ? '' : 's'}`}</p>
        </Link>
        <Link to="/hospital/dashboard/patients" className="dashboard-card">
          <h2>My Patients</h2>
          <p>{patientCount === null ? 'Loading…' : `${patientCount} patient${patientCount === 1 ? '' : 's'}`}</p>
        </Link>
      </div>

      <section>
        <h2>Notifications</h2>
        <p>No notifications yet. Built in Phase 2/4.</p>
      </section>

      <button type="button" className="btn-secondary" onClick={handleLogout}>
        Log out
      </button>
    </main>
  )
}

export default HospitalDashboard
