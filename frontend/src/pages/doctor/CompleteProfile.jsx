import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE_URL } from '../../api/config'
import { getToken } from '../../api/auth'
import { useProtectedProfile } from '../../api/useProtectedProfile'
import '../../components/CompleteProfile.css'

const EMPTY_FORM = {
  gender: '',
  qualification: '',
  specialization: '',
  hospitals_text: '',
  hospital_timings: '',
}

const GENDER_LABELS = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
  prefer_not_to_say: 'Prefer not to say',
}

function CompleteProfile() {
  const { data: doctor, error: loadError } = useProtectedProfile('doctor')
  const [form, setForm] = useState(EMPTY_FORM)
  const [profileCompleted, setProfileCompleted] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!doctor) return
    setForm({
      gender: doctor.gender || '',
      qualification: doctor.qualification || '',
      specialization: doctor.specialization || '',
      hospitals_text: doctor.hospitals_text || '',
      hospital_timings: doctor.hospital_timings || '',
    })
    setProfileCompleted(doctor.profile_completed)
  }, [doctor])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/doctor/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken('doctor')}`,
        },
        body: JSON.stringify(form),
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
  if (!doctor) return <p>Loading…</p>

  if (profileCompleted && !editing) {
    return (
      <main className="profile-page">
        <div className="profile-view-header">
          <div className="profile-view-avatar">{doctor.full_name.charAt(0).toUpperCase()}</div>
          <div>
            <h2>Dr. {doctor.full_name}</h2>
            <p className="profile-view-email">{doctor.email}</p>
          </div>
        </div>

        <dl className="profile-view-grid">
          <div className="profile-view-row">
            <dt>Gender</dt>
            <dd>{GENDER_LABELS[form.gender] || form.gender}</dd>
          </div>
          <div className="profile-view-row">
            <dt>Qualification</dt>
            <dd>{form.qualification}</dd>
          </div>
          <div className="profile-view-row">
            <dt>Specialization</dt>
            <dd>{form.specialization}</dd>
          </div>
          <div className="profile-view-row">
            <dt>Hospitals</dt>
            <dd>{form.hospitals_text}</dd>
          </div>
          <div className="profile-view-row">
            <dt>Timings</dt>
            <dd>{form.hospital_timings}</dd>
          </div>
        </dl>

        <div className="profile-view-actions">
          <Link to="/doctor/dashboard">Back to dashboard</Link>
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
      <p>These details appear alongside your listing once the public hospital directory ships.</p>

      {error && <p className="form-error">{error}</p>}

      <form onSubmit={handleSubmit} className="profile-form">
        <label>
          Gender
          <select name="gender" value={form.gender} onChange={handleChange} required>
            <option value="" disabled>
              Select
            </option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </label>
        <label>
          Qualification
          <input
            type="text"
            name="qualification"
            placeholder="e.g. MBBS, MD (Obstetrics & Gynaecology)"
            value={form.qualification}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Specialization
          <input
            type="text"
            name="specialization"
            placeholder="e.g. High-risk pregnancy care"
            value={form.specialization}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Hospitals you visit / work at
          <textarea
            name="hospitals_text"
            placeholder="e.g. Apollo Hospital, Fortis Hospital"
            value={form.hospitals_text}
            onChange={handleChange}
            rows={3}
            required
          />
        </label>
        <label>
          Timings at each hospital
          <textarea
            name="hospital_timings"
            placeholder="e.g. Apollo Hospital: Mon–Fri, 10am–1pm"
            value={form.hospital_timings}
            onChange={handleChange}
            rows={3}
            required
          />
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : profileCompleted ? 'Save changes' : 'Save and continue'}
        </button>
      </form>
    </main>
  )
}

export default CompleteProfile
