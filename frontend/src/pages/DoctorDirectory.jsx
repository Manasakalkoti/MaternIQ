// --- Phase 2 ---
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE_URL } from '../api/config'
import './DoctorDirectory.css'

function DoctorDirectory() {
  const [doctors, setDoctors] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/doctor/directory`)
      .then((response) => response.json())
      .then((data) => setDoctors(Array.isArray(data) ? data : []))
      .catch(() => setError('Could not reach the server. Is the backend running?'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = doctors.filter((doctor) => {
    const query = search.trim().toLowerCase()
    if (!query) return true
    return (
      doctor.name.toLowerCase().includes(query) ||
      doctor.hospital_name.toLowerCase().includes(query) ||
      doctor.qualification.toLowerCase().includes(query)
    )
  })

  return (
    <main className="doctor-directory">
      <Link to="/">Back to landing page</Link>
      <h1>Find a Doctor</h1>
      <p>Browse doctors across all registered hospitals. No account needed.</p>

      <input
        type="search"
        className="doctor-directory-search"
        placeholder="Search by doctor name, hospital, or qualification"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {loading && <p>Loading…</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && !error && filtered.length === 0 && <p>No doctors match your search.</p>}

      {!loading && !error && filtered.length > 0 && (
        <ul className="doctor-directory-list">
          {filtered.map((doctor) => (
            <li key={doctor.hospital_doctor_id} className="doctor-directory-card">
              <h2>{doctor.name}</h2>
              <p>{doctor.qualification}</p>
              <p>{doctor.hospital_name}</p>
              <p>
                {doctor.timings} · {doctor.days_per_week} days/week · {doctor.employment_type}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default DoctorDirectory
