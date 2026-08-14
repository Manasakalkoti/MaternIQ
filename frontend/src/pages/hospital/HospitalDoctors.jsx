import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE_URL } from '../../api/config'
import { getToken } from '../../api/auth'
import { useRequireAuth } from '../../api/useRequireAuth'
import '../../components/AuthForm.css'
import './HospitalSubpage.css'

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
const EMPTY_EDIT_DOCTOR_FORM = { qualification: '', timings: '', days_per_week: '', employment_type: 'visiting' }

function HospitalDoctors() {
  useRequireAuth('hospital')

  // --- Phase 2 ---
  const [doctors, setDoctors] = useState([])
  const [search, setSearch] = useState('')
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
  useEffect(() => {
    fetchDoctors()
  }, [])

  // --- Phase 2 ---
  const filteredDoctors = doctors.filter((doctor) => {
    const query = search.trim().toLowerCase()
    if (!query) return true
    return doctor.name.toLowerCase().includes(query) || doctor.qualification.toLowerCase().includes(query)
  })

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
  const [editingDoctorId, setEditingDoctorId] = useState(null)
  const [editDoctorForm, setEditDoctorForm] = useState(EMPTY_EDIT_DOCTOR_FORM)
  const [editDoctorError, setEditDoctorError] = useState('')
  const [submittingEditDoctor, setSubmittingEditDoctor] = useState(false)

  // --- Phase 2 ---
  const startEditDoctor = (doctor) => {
    setEditingDoctorId(doctor.hospital_doctor_id)
    setEditDoctorForm({
      qualification: doctor.qualification,
      timings: doctor.timings,
      days_per_week: doctor.days_per_week,
      employment_type: doctor.employment_type,
    })
    setEditDoctorError('')
  }

  // --- Phase 2 ---
  const cancelEditDoctor = () => {
    setEditingDoctorId(null)
    setEditDoctorForm(EMPTY_EDIT_DOCTOR_FORM)
    setEditDoctorError('')
  }

  // --- Phase 2 ---
  const handleEditDoctorChange = (event) => {
    const { name, value } = event.target
    setEditDoctorForm((prev) => ({ ...prev, [name]: value }))
  }

  // --- Phase 2 ---
  const handleEditDoctorSubmit = async (event, hospitalDoctorId) => {
    event.preventDefault()
    setEditDoctorError('')
    setSubmittingEditDoctor(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/hospital/doctors/${hospitalDoctorId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken('hospital')}`,
        },
        body: JSON.stringify({
          ...editDoctorForm,
          days_per_week: Number(editDoctorForm.days_per_week),
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        setEditDoctorError(data.error || 'Something went wrong')
        return
      }

      setEditingDoctorId(null)
      fetchDoctors()
    } catch {
      setEditDoctorError('Could not reach the server. Is the backend running?')
    } finally {
      setSubmittingEditDoctor(false)
    }
  }

  // --- Phase 2 ---
  const [doctorActionId, setDoctorActionId] = useState(null)
  const [doctorActionError, setDoctorActionError] = useState('')

  // --- Phase 2 ---
  const handleDoctorStatusToggle = async (doctor) => {
    setDoctorActionError('')
    setDoctorActionId(doctor.hospital_doctor_id)
    const action = doctor.is_active ? 'deactivate' : 'reactivate'

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/hospital/doctors/${doctor.hospital_doctor_id}/${action}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${getToken('hospital')}` },
        }
      )
      const data = await response.json()

      if (!response.ok) {
        setDoctorActionError(data.error || 'Something went wrong')
        return
      }

      fetchDoctors()
    } catch {
      setDoctorActionError('Could not reach the server. Is the backend running?')
    } finally {
      setDoctorActionId(null)
    }
  }

  return (
    <main className="hospital-subpage">
      <Link to="/hospital/dashboard" className="subpage-back">
        ← Back to dashboard
      </Link>
      <h1>My Doctors</h1>

      <input
        type="search"
        className="subpage-search"
        placeholder="Search by doctor name or qualification"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      <section>
        {doctorActionError && <p className="form-error">{doctorActionError}</p>}
        {doctors.length === 0 ? (
          <p>No doctors registered yet.</p>
        ) : filteredDoctors.length === 0 ? (
          <p>No doctors match your search.</p>
        ) : (
          <ul>
            {filteredDoctors.map((doctor) =>
              editingDoctorId === doctor.hospital_doctor_id ? (
                <li key={doctor.hospital_doctor_id}>
                  {editDoctorError && <p className="form-error">{editDoctorError}</p>}
                  <form
                    onSubmit={(event) => handleEditDoctorSubmit(event, doctor.hospital_doctor_id)}
                    className="auth-form"
                  >
                    <label>
                      Qualification
                      <input
                        type="text"
                        name="qualification"
                        value={editDoctorForm.qualification}
                        onChange={handleEditDoctorChange}
                        required
                      />
                    </label>
                    <label>
                      Timings
                      <input
                        type="text"
                        name="timings"
                        value={editDoctorForm.timings}
                        onChange={handleEditDoctorChange}
                        required
                      />
                    </label>
                    <label>
                      Days per week
                      <input
                        type="number"
                        name="days_per_week"
                        min="1"
                        max="7"
                        value={editDoctorForm.days_per_week}
                        onChange={handleEditDoctorChange}
                        required
                      />
                    </label>
                    <label>
                      Employment type
                      <select
                        name="employment_type"
                        value={editDoctorForm.employment_type}
                        onChange={handleEditDoctorChange}
                      >
                        <option value="visiting">Visiting</option>
                        <option value="permanent">Permanent</option>
                      </select>
                    </label>
                    <div className="form-actions">
                      <button type="submit" disabled={submittingEditDoctor}>
                        {submittingEditDoctor ? 'Saving…' : 'Save'}
                      </button>
                      <button type="button" className="btn-secondary" onClick={cancelEditDoctor}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </li>
              ) : (
                <li key={doctor.hospital_doctor_id} className="doctor-row">
                  <span>
                    {doctor.name} — {doctor.qualification} — {doctor.timings} ({doctor.days_per_week} days/week,{' '}
                    {doctor.employment_type}) — {doctor.is_active ? 'active' : 'deactivated'} —{' '}
                    {doctor.unlocked ? 'unlocked by doctor' : 'not yet unlocked'}
                  </span>
                  <div className="doctor-row-actions">
                    <button type="button" className="btn-secondary" onClick={() => startEditDoctor(doctor)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleDoctorStatusToggle(doctor)}
                      disabled={doctorActionId === doctor.hospital_doctor_id}
                    >
                      {doctorActionId === doctor.hospital_doctor_id
                        ? 'Please wait…'
                        : doctor.is_active
                        ? 'Deactivate'
                        : 'Reactivate'}
                    </button>
                  </div>
                </li>
              )
            )}
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
                    <input type="checkbox" checked={selectedDays.includes(day)} onChange={() => toggleDay(day)} />
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
                <input type="password" name="password" value={doctorForm.password} onChange={handleDoctorChange} />
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
    </main>
  )
}

export default HospitalDoctors
