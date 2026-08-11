import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../../api/config'
import { clearAuth, getToken } from '../../api/auth'
import { useProtectedProfile } from '../../api/useProtectedProfile'
import '../../components/ProfileAvatar.css'
import '../../components/AuthForm.css'
import './DoctorDashboard.css'

// --- Phase 2 ---
const EMPTY_UNLOCK_FORM = { login_email: '', password: '' }

function DoctorDashboard() {
  const navigate = useNavigate()
  const { data: doctor, error } = useProtectedProfile('doctor')
  const [search, setSearch] = useState('')

  // --- Phase 2 ---
  const [allHospitals, setAllHospitals] = useState([])
  const [unlockedHospitals, setUnlockedHospitals] = useState([])
  const [selectedHospital, setSelectedHospital] = useState(null)
  const [unlockForm, setUnlockForm] = useState(EMPTY_UNLOCK_FORM)
  const [unlockError, setUnlockError] = useState('')
  const [unlockInfo, setUnlockInfo] = useState('')
  const [submittingUnlock, setSubmittingUnlock] = useState(false)

  // --- Phase 2 ---
  const fetchUnlockedHospitals = () => {
    fetch(`${API_BASE_URL}/api/doctor/unlocked-hospitals`, {
      headers: { Authorization: `Bearer ${getToken('doctor')}` },
    })
      .then((response) => response.json())
      .then((data) => setUnlockedHospitals(Array.isArray(data) ? data : []))
      .catch(() => setUnlockedHospitals([]))
  }

  // --- Phase 2 ---
  useEffect(() => {
    if (!doctor) return
    fetch(`${API_BASE_URL}/api/hospital/directory`)
      .then((response) => response.json())
      .then((data) => setAllHospitals(Array.isArray(data) ? data : []))
      .catch(() => setAllHospitals([]))
    fetchUnlockedHospitals()
  }, [doctor])

  // --- Phase 2 ---
  const matchedHospitals = search.trim()
    ? allHospitals.filter((hospital) => {
        const query = search.trim().toLowerCase()
        return (
          hospital.name.toLowerCase().includes(query) ||
          hospital.area.toLowerCase().includes(query) ||
          hospital.district.toLowerCase().includes(query)
        )
      })
    : []

  // --- Phase 2 ---
  const selectHospital = (hospital) => {
    setSelectedHospital(hospital)
    setUnlockForm(EMPTY_UNLOCK_FORM)
    setUnlockError('')
    setUnlockInfo('')
  }

  // --- Phase 2 ---
  const handleUnlockChange = (event) => {
    const { name, value } = event.target
    setUnlockForm((prev) => ({ ...prev, [name]: value }))
  }

  // --- Phase 2 ---
  const handleUnlockSubmit = async (event) => {
    event.preventDefault()
    setUnlockError('')
    setUnlockInfo('')
    setSubmittingUnlock(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/doctor/unlock-hospital`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken('doctor')}`,
        },
        body: JSON.stringify({ hospital_id: selectedHospital.hospital_id, ...unlockForm }),
      })
      const data = await response.json()

      if (!response.ok) {
        setUnlockError(data.error || 'Something went wrong')
        return
      }

      setUnlockInfo(`${data.hospital_name} unlocked.`)
      setSelectedHospital(null)
      setSearch('')
      fetchUnlockedHospitals()
    } catch {
      setUnlockError('Could not reach the server. Is the backend running?')
    } finally {
      setSubmittingUnlock(false)
    }
  }

  const handleLogout = () => {
    clearAuth('doctor')
    navigate('/')
  }

  if (error) return <p>{error} — redirecting to login…</p>
  if (!doctor) return <p>Loading…</p>

  return (
    <main className="doctor-dashboard">
      <div className="doctor-dashboard-header">
        <h1>Welcome, Dr. {doctor.full_name}</h1>
        <div className="doctor-dashboard-header-actions">
          <Link
            to="/doctor/complete-profile"
            className="profile-avatar"
            title={doctor.profile_completed ? 'Your profile' : 'Complete your profile'}
          >
            {doctor.full_name.charAt(0).toUpperCase()}
            {!doctor.profile_completed && <span className="profile-avatar-dot" />}
          </Link>
          <button type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>

      <form className="hospital-search" onSubmit={(event) => event.preventDefault()}>
        <input
          type="search"
          placeholder="Search hospitals by name, area, or district"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </form>

      {/* --- Phase 2 --- */}
      {matchedHospitals.length > 0 && (
        <ul className="hospital-search-results">
          {matchedHospitals.map((hospital) => (
            <li key={hospital.hospital_id}>
              {hospital.name} — {hospital.area}, {hospital.district}
              <button type="button" onClick={() => selectHospital(hospital)}>
                Unlock
              </button>
            </li>
          ))}
        </ul>
      )}
      {search.trim() && matchedHospitals.length === 0 && <p>No hospitals match "{search}".</p>}

      {/* --- Phase 2 --- */}
      {selectedHospital && (
        <section>
          <h2>Unlock {selectedHospital.name}</h2>
          <p>Enter the login email and password this hospital issued you.</p>
          {unlockError && <p className="form-error">{unlockError}</p>}
          <form onSubmit={handleUnlockSubmit} className="auth-form">
            <label>
              Login email
              <input
                type="email"
                name="login_email"
                value={unlockForm.login_email}
                onChange={handleUnlockChange}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
                value={unlockForm.password}
                onChange={handleUnlockChange}
                required
              />
            </label>
            <button type="submit" disabled={submittingUnlock}>
              {submittingUnlock ? 'Please wait…' : 'Unlock'}
            </button>
          </form>
        </section>
      )}

      {unlockInfo && <p className="form-info">{unlockInfo}</p>}

      <section>
        <h2>My Unlocked Hospitals</h2>
        {unlockedHospitals.length === 0 ? (
          <p>You haven't unlocked any hospitals yet.</p>
        ) : (
          <ul>
            {unlockedHospitals.map((hospital) => (
              <li key={hospital.hospital_doctor_id}>
                {hospital.hospital_name} — {hospital.qualification} — {hospital.timings} (
                {hospital.days_per_week} days/week, {hospital.employment_type}) —{' '}
                {hospital.is_active ? 'active' : 'deactivated by hospital'}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default DoctorDashboard
