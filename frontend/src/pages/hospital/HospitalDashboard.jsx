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
const EMPTY_ACCESS_CODE_FORM = { patient_name: '', patient_phone: '', patient_email: '', hospital_doctor_id: '' }

function HospitalDashboard() {
  const navigate = useNavigate()
  const { data: hospital, error } = useProtectedProfile('hospital')

  // --- Phase 2 ---
  const [doctors, setDoctors] = useState([])
  const [doctorForm, setDoctorForm] = useState(EMPTY_DOCTOR_FORM)
  const [timeBlocks, setTimeBlocks] = useState([{ start: '', end: '' }])
  const [selectedDays, setSelectedDays] = useState([])
  const [doctorError, setDoctorError] = useState('')
  const [doctorInfo, setDoctorInfo] = useState('')
  const [submittingDoctor, setSubmittingDoctor] = useState(false)

  // --- Phase 2 ---
  const toggleDay = (day) => {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  // --- Phase 2 ---
  const updateTimeBlock = (index, field, value) => {
    setTimeBlocks((prev) => prev.map((block, i) => (i === index ? { ...block, [field]: value } : block)))
  }

  // --- Phase 2 ---
  const addTimeBlock = () => {
    setTimeBlocks((prev) => [...prev, { start: '', end: '' }])
  }

  // --- Phase 2 ---
  const removeTimeBlock = (index) => {
    setTimeBlocks((prev) => prev.filter((_, i) => i !== index))
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
  const [patients, setPatients] = useState([])

  // --- Phase 2 ---
  const fetchPatients = () => {
    fetch(`${API_BASE_URL}/api/hospital/patients`, {
      headers: { Authorization: `Bearer ${getToken('hospital')}` },
    })
      .then((response) => response.json())
      .then((data) => setPatients(Array.isArray(data) ? data : []))
      .catch(() => setPatients([]))
  }

  // --- Phase 2 ---
  useEffect(() => {
    if (hospital) {
      fetchDoctors()
      fetchPatients()
    }
  }, [hospital])

  // --- Phase 2 ---
  const handleDoctorChange = (event) => {
    const { name, value } = event.target
    setDoctorForm((prev) => ({ ...prev, [name]: value }))
  }

  // --- Phase 2 ---
  const [showDoctorForm, setShowDoctorForm] = useState(false)

  // --- Phase 2 ---
  const handleDoctorCancel = () => {
    setShowDoctorForm(false)
    setDoctorForm(EMPTY_DOCTOR_FORM)
    setTimeBlocks([{ start: '', end: '' }])
    setSelectedDays([])
    setDoctorError('')
    setDoctorInfo('')
  }

  // --- Phase 2 ---
  const handleDoctorSubmit = async (event) => {
    event.preventDefault()
    setDoctorError('')
    setDoctorInfo('')

    const validTimeBlocks = timeBlocks.filter((block) => block.start && block.end)
    if (validTimeBlocks.length === 0) {
      setDoctorError('Please add at least one time block with a start and end time')
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
          timings: validTimeBlocks.map((block) => `${formatTime(block.start)} - ${formatTime(block.end)}`).join(', '),
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
        data.email_sent
          ? `Doctor registered. Login credentials emailed to ${data.login_email}.`
          : `Doctor registered, but could not email the credentials automatically. Login email: ${data.login_email}${data.generated_password ? ` — generated password: ${data.generated_password}` : ''} (share this with the doctor yourself).`
      )
      setDoctorForm(EMPTY_DOCTOR_FORM)
      setTimeBlocks([{ start: '', end: '' }])
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
  const [showAccessCodeForm, setShowAccessCodeForm] = useState(false)

  // --- Phase 2 ---
  const handleAccessCodeCancel = () => {
    setShowAccessCodeForm(false)
    setAccessCodeForm(EMPTY_ACCESS_CODE_FORM)
    setAccessCodeError('')
    setAccessCodeInfo('')
  }

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
        data.email_sent
          ? `Code sent to ${data.patient_name} (assigned to ${data.assigned_doctor}, expires ${new Date(data.code_expires_at).toLocaleDateString()}).`
          : `Could not send the email automatically. Access code for ${data.patient_name}: ${data.access_code} (assigned to ${data.assigned_doctor}, expires ${new Date(data.code_expires_at).toLocaleDateString()}) — please share this code with the patient yourself.`
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

  // --- Phase 2 ---
  const assignableDoctors = doctors.filter((doctor) => doctor.is_active && doctor.unlocked)

  if (error) return <p>{error} — redirecting to login…</p>
  if (!hospital) return <p>Loading…</p>

  return (
    <main className="hospital-dashboard">
      <div className="hospital-dashboard-header">
        <h1>{hospital.name}</h1>
        <button type="button" className="btn-secondary" onClick={handleLogout}>
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
        {patients.length === 0 ? (
          <p>No patients connected yet.</p>
        ) : (
          <ul>
            {patients.map((patient) => (
              <li key={patient.assignment_id}>
                {patient.patient_name} — {patient.doctor_name} —{' '}
                {patient.is_active ? 'active' : 'reassigned/deactivated'}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Register New Doctor</h2>
        {!showDoctorForm && (
          <button type="button" className="add-button" onClick={() => setShowDoctorForm(true)}>
            + Register Doctor
          </button>
        )}
        {showDoctorForm && (
          <>
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
          <label>Working hours</label>
          {timeBlocks.map((block, index) => (
            <div key={index} className="time-block-row">
              <input
                type="time"
                value={block.start}
                onChange={(event) => updateTimeBlock(index, 'start', event.target.value)}
                required
              />
              <span>to</span>
              <input
                type="time"
                value={block.end}
                onChange={(event) => updateTimeBlock(index, 'end', event.target.value)}
                required
              />
              {timeBlocks.length > 1 && (
                <button type="button" className="time-block-remove" onClick={() => removeTimeBlock(index)}>
                  Remove
                </button>
              )}
            </div>
          ))}
          <button type="button" className="time-block-add" onClick={addTimeBlock}>
            + Add another time block
          </button>
          {timeBlocks.some((block) => block.start && block.end) && (
            <p className="form-info">
              Timings:{' '}
              {timeBlocks
                .filter((block) => block.start && block.end)
                .map((block) => `${formatTime(block.start)} - ${formatTime(block.end)}`)
                .join(', ')}
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
          <div className="form-actions">
            <button type="submit" disabled={submittingDoctor}>
              {submittingDoctor ? 'Please wait…' : 'Register Doctor'}
            </button>
            <button type="button" className="btn-secondary" onClick={handleDoctorCancel}>
              Cancel
            </button>
          </div>
        </form>
          </>
        )}
      </section>

      <section>
        <h2>Register New Patient / Generate Access Code</h2>
        {assignableDoctors.length === 0 ? (
          <p>No doctors available yet — register a doctor and have them unlock their account first.</p>
        ) : !showAccessCodeForm ? (
          <button type="button" className="add-button" onClick={() => setShowAccessCodeForm(true)}>
            + Register Patient
          </button>
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
                Patient email
                <input
                  type="email"
                  name="patient_email"
                  value={accessCodeForm.patient_email}
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
                  {assignableDoctors.map((doctor) => (
                    <option key={doctor.hospital_doctor_id} value={doctor.hospital_doctor_id}>
                      {doctor.name} — {doctor.qualification}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-actions">
                <button type="submit" disabled={submittingAccessCode}>
                  {submittingAccessCode ? 'Please wait…' : 'Generate Access Code'}
                </button>
                <button type="button" className="btn-secondary" onClick={handleAccessCodeCancel}>
                  Cancel
                </button>
              </div>
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
