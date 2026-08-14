import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE_URL } from '../../api/config'
import { useRequireAuth } from '../../api/useRequireAuth'
import './HospitalManagementDashboard.css'

function HospitalDirectory() {
  useRequireAuth('patient')

  const [hospitals, setHospitals] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/hospital/directory`)
      .then((response) => response.json())
      .then((data) => setHospitals(Array.isArray(data) ? data : []))
      .catch(() => setHospitals([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = hospitals.filter((hospital) => {
    const query = search.trim().toLowerCase()
    if (!query) return true
    return (
      hospital.name.toLowerCase().includes(query) ||
      hospital.area.toLowerCase().includes(query) ||
      hospital.district.toLowerCase().includes(query) ||
      hospital.state.toLowerCase().includes(query)
    )
  })

  return (
    <main className="hospital-management">
      <Link to="/patient/dashboard/hospitals">Back to hospital management</Link>
      <h1>All Registered Hospitals</h1>

      <input
        type="search"
        className="hospital-management-search"
        placeholder="Search by hospital name, area, district, or state"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {loading && <p>Loading…</p>}

      {!loading && filtered.length === 0 && <p>No hospitals match your search.</p>}

      {!loading && filtered.length > 0 && (
        <ul>
          {filtered.map((hospital) => (
            <li key={hospital.hospital_id}>
              {hospital.name} — {hospital.area}, {hospital.district}, {hospital.state}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default HospitalDirectory
