import { Link } from 'react-router-dom'
import './Landing.css'

const PROFILES = [
  { label: 'Maternal Patient', path: '/patient' },
  { label: 'Doctor', path: '/doctor' },
  { label: 'Hospital', path: '/hospital' },
]

function Landing() {
  return (
    <main className="landing">
      <h1>MaternIQ</h1>
      <p>Choose how you'd like to continue</p>

      <div className="profile-options">
        {PROFILES.map((profile) => (
          <Link key={profile.path} to={profile.path} className="profile-button">
            {profile.label}
          </Link>
        ))}
      </div>

      {/* --- Phase 2 --- */}
      <Link to="/doctors" className="doctor-directory-link">
        Browse Doctors
      </Link>
    </main>
  )
}

export default Landing
