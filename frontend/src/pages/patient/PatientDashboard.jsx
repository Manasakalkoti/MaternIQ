import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../../api/config'
import { clearAuth, getToken } from '../../api/auth'

function PatientDashboard() {
  const navigate = useNavigate()
  const [patient, setPatient] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = getToken('patient')
    if (!token) {
      navigate('/patient')
      return
    }

    fetch(`${API_BASE_URL}/api/patient/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Session expired')
        setPatient(data)
      })
      .catch((err) => {
        setError(err.message)
        clearAuth('patient')
        setTimeout(() => navigate('/patient'), 1500)
      })
  }, [navigate])

  const handleLogout = () => {
    clearAuth('patient')
    navigate('/')
  }

  if (error) return <p>{error} — redirecting to login…</p>
  if (!patient) return <p>Loading…</p>

  return (
    <main style={{ maxWidth: 420, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1>Welcome, {patient.full_name || patient.email}</h1>
      <p>This confirms the JWT-protected /me route is working.</p>
      <ul>
        <li>Email: {patient.email}</li>
        <li>Phone: {patient.phone || 'Not provided'}</li>
        <li>Age: {patient.age ?? 'Not provided'}</li>
        <li>Trimester: {patient.trimester ?? 'Not provided'}</li>
        <li>Due date: {patient.due_date || 'Not provided'}</li>
        <li>Job type: {patient.job_type || 'Not provided'}</li>
        <li>Conditions: {patient.conditions || 'None recorded'}</li>
      </ul>
      <button type="button" onClick={handleLogout}>
        Log out
      </button>
    </main>
  )
}

export default PatientDashboard
