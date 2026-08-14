import { Link } from 'react-router-dom'
import { useProtectedProfile } from '../../api/useProtectedProfile'
import './HospitalSubpage.css'

function HospitalProfile() {
  const { data: hospital, error } = useProtectedProfile('hospital')

  if (error) return <p>{error} — redirecting to login…</p>
  if (!hospital) return <p>Loading…</p>

  return (
    <main className="hospital-subpage">
      <Link to="/hospital/dashboard" className="subpage-back">
        ← Back to dashboard
      </Link>
      <h1>Hospital Profile</h1>

      <section>
        <div className="profile-card">
          <div className="profile-card-header">
            <span className="profile-card-avatar">{hospital.name.charAt(0).toUpperCase()}</span>
            <div>
              <div className="profile-card-name">{hospital.name}</div>
              <div className="profile-card-subtitle">{hospital.email}</div>
            </div>
          </div>
          <div className="profile-card-rows">
            <div className="profile-card-row">
              <span className="profile-card-label">Address</span>
              <span className="profile-card-value">{hospital.address}</span>
            </div>
            <div className="profile-card-row">
              <span className="profile-card-label">Pincode</span>
              <span className="profile-card-value">{hospital.pincode}</span>
            </div>
            <div className="profile-card-row">
              <span className="profile-card-label">Area</span>
              <span className="profile-card-value">{hospital.area}</span>
            </div>
            <div className="profile-card-row">
              <span className="profile-card-label">District</span>
              <span className="profile-card-value">{hospital.district}</span>
            </div>
            <div className="profile-card-row">
              <span className="profile-card-label">State</span>
              <span className="profile-card-value">{hospital.state}</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default HospitalProfile
