import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE_URL } from '../../api/config'
import { getToken } from '../../api/auth'
import { useProtectedProfile } from '../../api/useProtectedProfile'
import '../../components/CompleteProfile.css'

const EMPTY_FORM = {
  phone: '',
  address: '',
  age: '',
  gender: '',
  trimester: '',
  due_date: '',
  conditions: '',
  job_type: '',
}

const GENDER_LABELS = {
  female: 'Female',
  other: 'Other',
  prefer_not_to_say: 'Prefer not to say',
}

const TRIMESTER_LABELS = {
  1: '1st trimester',
  2: '2nd trimester',
  3: '3rd trimester',
}

function CompleteProfile() {
  const { data: patient, error: loadError } = useProtectedProfile('patient')
  const [form, setForm] = useState(EMPTY_FORM)
  const [profileCompleted, setProfileCompleted] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!patient) return
    setForm({
      phone: patient.phone || '',
      address: patient.address || '',
      age: patient.age != null ? String(patient.age) : '',
      gender: patient.gender || '',
      trimester: patient.trimester != null ? String(patient.trimester) : '',
      due_date: patient.due_date || '',
      conditions: patient.conditions || '',
      job_type: patient.job_type || '',
    })
    setProfileCompleted(patient.profile_completed)
  }, [patient])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/patient/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken('patient')}`,
        },
        body: JSON.stringify({ ...form, age: Number(form.age), trimester: Number(form.trimester) }),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Something went wrong')
        return
      }

      setProfileCompleted(true)
      setEditing(false)
    } catch {
      setError('Could not reach the server. Is the backend running?')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadError) return <p>{loadError} — redirecting to login…</p>
  if (!patient) return <p>Loading…</p>

  if (profileCompleted && !editing) {
    return (
      <main className="profile-page">
        <div className="profile-view-header">
          <div className="profile-view-avatar">{patient.full_name.charAt(0).toUpperCase()}</div>
          <div>
            <h2>{patient.full_name}</h2>
            <p className="profile-view-email">{patient.email}</p>
          </div>
        </div>

        <dl className="profile-view-grid">
          <div className="profile-view-row">
            <dt>Phone</dt>
            <dd>{form.phone}</dd>
          </div>
          <div className="profile-view-row">
            <dt>Address</dt>
            <dd>{form.address}</dd>
          </div>
          <div className="profile-view-row">
            <dt>Age</dt>
            <dd>{form.age}</dd>
          </div>
          <div className="profile-view-row">
            <dt>Gender</dt>
            <dd>{GENDER_LABELS[form.gender] || form.gender}</dd>
          </div>
          <div className="profile-view-row">
            <dt>Trimester</dt>
            <dd>{TRIMESTER_LABELS[form.trimester] || form.trimester}</dd>
          </div>
          <div className="profile-view-row">
            <dt>Expected due date</dt>
            <dd>{form.due_date}</dd>
          </div>
          <div className="profile-view-row">
            <dt>Job type</dt>
            <dd>{form.job_type}</dd>
          </div>
          <div className="profile-view-row">
            <dt>Existing conditions</dt>
            <dd>{form.conditions || 'None specified'}</dd>
          </div>
        </dl>

        <div className="profile-view-actions">
          <Link to="/patient/dashboard">Back to dashboard</Link>
          <button type="button" onClick={() => setEditing(true)}>
            Edit profile
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="profile-page">
      <h1>Complete your profile</h1>
      <p>A few more details help us tailor your dashboard and guidance.</p>

      {error && <p className="form-error">{error}</p>}

      <form onSubmit={handleSubmit} className="profile-form">
        <label>
          Phone number
          <input type="tel" name="phone" value={form.phone} onChange={handleChange} required />
        </label>
        <label>
          Address
          <input type="text" name="address" value={form.address} onChange={handleChange} required />
        </label>
        <label>
          Age
          <input type="number" name="age" min="10" max="60" value={form.age} onChange={handleChange} required />
        </label>
        <label>
          Gender
          <select name="gender" value={form.gender} onChange={handleChange} required>
            <option value="" disabled>
              Select
            </option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </label>
        <label>
          Trimester
          <select name="trimester" value={form.trimester} onChange={handleChange} required>
            <option value="" disabled>
              Select
            </option>
            <option value="1">1st</option>
            <option value="2">2nd</option>
            <option value="3">3rd</option>
          </select>
        </label>
        <label>
          Expected due date
          <input type="date" name="due_date" value={form.due_date} onChange={handleChange} required />
        </label>
        <label>
          Job type
          <input type="text" name="job_type" value={form.job_type} onChange={handleChange} required />
        </label>
        <label>
          Existing conditions (optional)
          <textarea name="conditions" value={form.conditions} onChange={handleChange} rows={3} />
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : profileCompleted ? 'Save changes' : 'Save and continue'}
        </button>
      </form>
    </main>
  )
}

export default CompleteProfile
