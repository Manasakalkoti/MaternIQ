import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../../api/config'
import { clearAuth, getToken } from '../../api/auth'
import { useProtectedProfile } from '../../api/useProtectedProfile'
import '../../components/AuthForm.css'
import './HospitalDashboard.css'

// --- Phase 2 ---
const EMPTY_DOCTOR_FORM = {
  name: '',
  qualification: '',
  employment_type: 'visiting',
  login_email: '',
  password: '',
}

// --- Phase 2 ---
const DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// --- Phase 2 ---
function formatTime(value) {
  if (!value) return ''
  return new Date(`1970-01-01T${value}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

// --- Phase 2 ---
const EMPTY_ACCESS_CODE_FORM = { patient_name: '', patient_phone: '', hospital_doctor_id: '' }

function HospitalDashboard() {
  const navigate = useNavigate()
  const { data: hospital, error } = useProtectedProfile('hospital')

  // --- Phase 2 ---
  const [doctors, setDoctors] = useState([])
  const [doctorForm, setDoctorForm] = useState(EMPTY_DOCTOR_FORM)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [selectedDays, setSelectedDays] = useState([])
  const [doctorError, setDoctorError] = useState('')
  const [doctorInfo, setDoctorInfo] = useState('')
  const [submittingDoctor, setSubmittingDoctor] = useState(false)

  // --- Phase 2 ---
  const toggleDay = (day) => {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  // --- Phase 2 ---
  const fetchDoctors = () => {
    fetch(`${API_BASE_URL}/api/hospital/doctors`, {
      headers: { Authorization: `Bearer ${getToken('hospital')}` },
    })
      .then((response) => response.json())
      .then((data) => setDoctors(Array.isArray(data) ? data : []))
      .catch(() => setDoctors([]))
  }

  // --- Phase 2 ---
  useEffect(() => {
    if (hospital) fetchDoctors()
  }, [hospital])

  // --- Phase 2 ---
  const handleDoctorChange = (event) => {
    const { name, value } = event.target
    setDoctorForm((prev) => ({ ...prev, [name]: value }))
  }

  // --- Phase 2 ---
  const handleDoctorSubmit = async (event) => {
    event.preventDefault()
    setDoctorError('')
    setDoctorInfo('')

    if (!startTime || !endTime) {
      setDoctorError('Please select both a start and end time')
      return
    }
    if (selectedDays.length === 0) {
      setDoctorError('Please select at least one working day')
      return
    }

    setSubmittingDoctor(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/hospital/doctors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken('hospital')}`,
        },
        body: JSON.stringify({
          ...doctorForm,
          timings: `${formatTime(startTime)} - ${formatTime(endTime)}`,
          days_per_week: selectedDays.length,
          password: doctorForm.password || undefined,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        setDoctorError(data.error || 'Something went wrong')
        return
      }

      setDoctorInfo(
        data.generated_password
          ? `Doctor registered. Login email: ${data.login_email} — generated password: ${data.generated_password} (share this with the doctor now, it won't be shown again).`
          : `Doctor registered. Login email: ${data.login_email}.`
      )
      setDoctorForm(EMPTY_DOCTOR_FORM)
      setStartTime('')
      setEndTime('')
      setSelectedDays([])
      fetchDoctors()
    } catch {
      setDoctorError('Could not reach the server. Is the backend running?')
    } finally {
      setSubmittingDoctor(false)
    }
  }

  // --- Phase 2 ---
  const [accessCodeForm, setAccessCodeForm] = useState(EMPTY_ACCESS_CODE_FORM)
  const [accessCodeError, setAccessCodeError] = useState('')
  const [accessCodeInfo, setAccessCodeInfo] = useState('')
  const [submittingAccessCode, setSubmittingAccessCode] = useState(false)

  // --- Phase 2 ---
  const handleAccessCodeChange = (event) => {
    const { name, value } = event.target
    setAccessCodeForm((prev) => ({ ...prev, [name]: value }))
  }

  // --- Phase 2 ---
  const handleAccessCodeSubmit = async (event) => {
    event.preventDefault()
    setAccessCodeError('')
    setAccessCodeInfo('')
    setSubmittingAccessCode(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/hospital/access-codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken('hospital')}`,
        },
        body: JSON.stringify({
          ...accessCodeForm,
          hospital_doctor_id: Number(accessCodeForm.hospital_doctor_id),
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        setAccessCodeError(data.error || 'Something went wrong')
        return
      }

      setAccessCodeInfo(
        `Access code for ${data.patient_name}: ${data.access_code} (assigned to ${data.assigned_doctor}, expires ${new Date(data.code_expires_at).toLocaleDateString()}). Share this code with the patient now.`
      )
      setAccessCodeForm(EMPTY_ACCESS_CODE_FORM)
    } catch {
      setAccessCodeError('Could not reach the server. Is the backend running?')
    } finally {
      setSubmittingAccessCode(false)
    }
  }

  const handleLogout = () => {
    clearAuth('hospital')
    navigate('/')
  }

  if (error) return <p>{error} — redirecting to login…</p>
  if (!hospital) return <p>Loading…</p>

  return (
    <main className="hospital-dashboard">
      <div className="hospital-dashboard-header">
        <h1>{hospital.name}</h1>
        <button type="button" onClick={handleLogout}>
          Log out
        </button>
      </div>

      <section>
        <h2>My Doctors</h2>
        {doctors.length === 0 ? (
          <p>No doctors registered yet.</p>
        ) : (
          <ul>
            {doctors.map((doctor) => (
              <li key={doctor.hospital_doctor_id}>
                {doctor.name} — {doctor.qualification} — {doctor.timings} ({doctor.days_per_week} days/week,{' '}
                {doctor.employment_type}) — {doctor.is_active ? 'active' : 'deactivated'} —{' '}
                {doctor.unlocked ? 'unlocked by doctor' : 'not yet unlocked'}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>My Patients</h2>
        <p>No patients connected yet. Built in Phase 2.</p>
      </section>

      <section>
        <h2>Register New Doctor</h2>
        {doctorError && <p className="form-error">{doctorError}</p>}
        {doctorInfo && <p className="form-info">{doctorInfo}</p>}
        <form onSubmit={handleDoctorSubmit} className="auth-form">
          <label>
            Name
            <input type="text" name="name" value={doctorForm.name} onChange={handleDoctorChange} required />
          </label>
          <label>
            Qualification
            <input
              type="text"
              name="qualification"
              value={doctorForm.qualification}
              onChange={handleDoctorChange}
              required
            />
          </label>
          <label>
            Start time
            <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
          </label>
          <label>
            End time
            <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} required />
          </label>
          {startTime && endTime && (
            <p className="form-info">
              Timings: {formatTime(startTime)} - {formatTime(endTime)}
            </p>
          )}
          <label>Working days</label>
          <div className="day-picker">
            {DAY_OPTIONS.map((day) => (
              <label key={day} className="day-picker-option">
                <input
                  type="checkbox"
                  checked={selectedDays.includes(day)}
                  onChange={() => toggleDay(day)}
                />
                {day}
              </label>
            ))}
          </div>
          <p className="form-info">{selectedDays.length} days/week selected</p>
          <label>
            Employment type
            <select name="employment_type" value={doctorForm.employment_type} onChange={handleDoctorChange}>
              <option value="visiting">Visiting</option>
              <option value="permanent">Permanent</option>
            </select>
          </label>
          <label>
            Login email (hospital-issued, for this doctor's unlock)
            <input
              type="email"
              name="login_email"
              value={doctorForm.login_email}
              onChange={handleDoctorChange}
              required
            />
          </label>
          <label>
            Password (leave blank to auto-generate)
            <input
              type="password"
              name="password"
              value={doctorForm.password}
              onChange={handleDoctorChange}
            />
          </label>
          <button type="submit" disabled={submittingDoctor}>
            {submittingDoctor ? 'Please wait…' : 'Register Doctor'}
          </button>
        </form>
      </section>

      <section>
        <h2>Register New Patient / Generate Access Code</h2>
        {doctors.length === 0 ? (
          <p>Register a doctor first before generating access codes.</p>
        ) : (
          <>
            {accessCodeError && <p className="form-error">{accessCodeError}</p>}
            {accessCodeInfo && <p className="form-info">{accessCodeInfo}</p>}
            <form onSubmit={handleAccessCodeSubmit} className="auth-form">
              <label>
                Patient name
                <input
                  type="text"
                  name="patient_name"
                  value={accessCodeForm.patient_name}
                  onChange={handleAccessCodeChange}
                  required
                />
              </label>
              <label>
                Patient phone
                <input
                  type="tel"
                  name="patient_phone"
                  value={accessCodeForm.patient_phone}
                  onChange={handleAccessCodeChange}
                  required
                />
              </label>
              <label>
                Assign doctor
                <select
                  name="hospital_doctor_id"
                  value={accessCodeForm.hospital_doctor_id}
                  onChange={handleAccessCodeChange}
                  required
                >
                  <option value="" disabled>
                    Select a doctor
                  </option>
                  {doctors
                    .filter((doctor) => doctor.is_active)
                    .map((doctor) => (
                      <option key={doctor.hospital_doctor_id} value={doctor.hospital_doctor_id}>
                        {doctor.name} — {doctor.qualification}
                      </option>
                    ))}
                </select>
              </label>
              <button type="submit" disabled={submittingAccessCode}>
                {submittingAccessCode ? 'Please wait…' : 'Generate Access Code'}
              </button>
            </form>
          </>
        )}
      </section>

      <section>
        <h2>Hospital Public Profile</h2>
        <p>Email: {hospital.email}</p>
        <p>Address: {hospital.address}</p>
        <p>Pincode: {hospital.pincode}</p>
        <p>Area: {hospital.area}</p>
        <p>District: {hospital.district}</p>
        <p>State: {hospital.state}</p>
      </section>

      <section>
        <h2>Notifications</h2>
        <p>No notifications yet. Built in Phase 2/4.</p>
      </section>
    </main>
  )
}

export default HospitalDashboard
