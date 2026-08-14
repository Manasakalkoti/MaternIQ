import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE_URL } from '../../api/config'
import { getToken } from '../../api/auth'
import { useRequireAuth } from '../../api/useRequireAuth'
import '../../components/AuthForm.css'
import './HospitalSubpage.css'

// --- Phase 2 ---
const EMPTY_ACCESS_CODE_FORM = { patient_name: '', patient_phone: '', patient_email: '', hospital_doctor_id: '' }

function HospitalPatients() {
  useRequireAuth('hospital')

  // --- Phase 2 ---
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [search, setSearch] = useState('')

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
    fetchPatients()
    fetch(`${API_BASE_URL}/api/hospital/doctors`, {
      headers: { Authorization: `Bearer ${getToken('hospital')}` },
    })
      .then((response) => response.json())
      .then((data) => setDoctors(Array.isArray(data) ? data : []))
      .catch(() => setDoctors([]))
  }, [])

  // --- Phase 2 ---
  const filteredPatients = patients.filter((patient) => {
    const query = search.trim().toLowerCase()
    if (!query) return true
    return (
      patient.patient_name.toLowerCase().includes(query) ||
      (patient.patient_phone || '').toLowerCase().includes(query)
    )
  })

  // --- Phase 2 ---
  const assignableDoctors = doctors.filter((doctor) => doctor.is_active && doctor.unlocked)

  // --- Phase 2 ---
  const [accessCodeForm, setAccessCodeForm] = useState(EMPTY_ACCESS_CODE_FORM)
  const [accessCodeError, setAccessCodeError] = useState('')
  const [accessCodeInfo, setAccessCodeInfo] = useState('')
  const [submittingAccessCode, setSubmittingAccessCode] = useState(false)
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
      fetchPatients()
    } catch {
      setAccessCodeError('Could not reach the server. Is the backend running?')
    } finally {
      setSubmittingAccessCode(false)
    }
  }

  return (
    <main className="hospital-subpage">
      <Link to="/hospital/dashboard" className="subpage-back">
        ← Back to dashboard
      </Link>
      <h1>My Patients</h1>

      <input
        type="search"
        className="subpage-search"
        placeholder="Search by patient name or phone"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      <section>
        {patients.length === 0 ? (
          <p>No patients connected yet.</p>
        ) : filteredPatients.length === 0 ? (
          <p>No patients match your search.</p>
        ) : (
          <ul>
            {filteredPatients.map((patient) => (
              <li key={patient.assignment_id}>
                {patient.patient_name} — {patient.patient_phone} — {patient.doctor_name} —{' '}
                {patient.is_active ? 'active' : 'reassigned/deactivated'}
              </li>
            ))}
          </ul>
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
    </main>
  )
}

export default HospitalPatients
