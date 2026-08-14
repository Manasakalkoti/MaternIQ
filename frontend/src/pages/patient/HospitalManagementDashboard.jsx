import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE_URL } from '../../api/config'
import { getToken } from '../../api/auth'
import { useRequireAuth } from '../../api/useRequireAuth'
import '../../components/AuthForm.css'
import './HospitalManagementDashboard.css'

// --- Phase 2 ---
const EMPTY_REDEEM_FORM = { access_code: '', share_pre_connection_history: '' }

function HospitalManagementDashboard() {
  useRequireAuth('patient')

  // --- Phase 2 ---
  const [connectedHospitals, setConnectedHospitals] = useState([])
  const [redeemForm, setRedeemForm] = useState(EMPTY_REDEEM_FORM)
  const [redeemError, setRedeemError] = useState('')
  const [redeemInfo, setRedeemInfo] = useState('')
  const [submittingRedeem, setSubmittingRedeem] = useState(false)

  // --- Phase 2 ---
  const fetchConnectedHospitals = () => {
    fetch(`${API_BASE_URL}/api/patient/connected-hospitals`, {
      headers: { Authorization: `Bearer ${getToken('patient')}` },
    })
      .then((response) => response.json())
      .then((data) => setConnectedHospitals(Array.isArray(data) ? data : []))
      .catch(() => setConnectedHospitals([]))
  }

  // --- Phase 2 ---
  useEffect(() => {
    fetchConnectedHospitals()
  }, [])

  // --- Phase 2 ---
  const handleRedeemChange = (event) => {
    const { name, value } = event.target
    setRedeemForm((prev) => ({ ...prev, [name]: value }))
  }

  // --- Phase 2 ---
  const handleRedeemSubmit = async (event) => {
    event.preventDefault()
    setRedeemError('')
    setRedeemInfo('')

    if (redeemForm.share_pre_connection_history === '') {
      setRedeemError('Please choose whether to share your pre-connection history')
      return
    }

    setSubmittingRedeem(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/patient/redeem-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken('patient')}`,
        },
        body: JSON.stringify({
          access_code: redeemForm.access_code,
          share_pre_connection_history: redeemForm.share_pre_connection_history === 'yes',
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        setRedeemError(data.error || 'Something went wrong')
        return
      }

      setRedeemInfo('Hospital connected successfully.')
      setRedeemForm(EMPTY_REDEEM_FORM)
      fetchConnectedHospitals()
    } catch {
      setRedeemError('Could not reach the server. Is the backend running?')
    } finally {
      setSubmittingRedeem(false)
    }
  }

  return (
    <main className="hospital-management">
      <Link to="/patient/dashboard">Back to dashboard</Link>
      <h1>Hospital Management</h1>

      <section>
        <h2>My Wearable Device</h2>
        <p>No device connected yet. Built in Phase 3.</p>
      </section>

      <section>
        <h2>My Connected Hospitals</h2>
        {connectedHospitals.length === 0 ? (
          <p>Not connected to any hospital yet.</p>
        ) : (
          <ul>
            {connectedHospitals.map((connection) => (
              <li key={connection.assignment_id}>
                {connection.hospital_name} — {connection.doctor_name} ({connection.qualification}) —{' '}
                {connection.is_active ? 'active' : 'reassigned/deactivated'}
              </li>
            ))}
          </ul>
        )}

        {/* --- Phase 2 --- */}
        <h3>Have an access code?</h3>
        {redeemError && <p className="form-error">{redeemError}</p>}
        {redeemInfo && <p className="form-info">{redeemInfo}</p>}
        <form onSubmit={handleRedeemSubmit} className="auth-form">
          <label>
            Access code
            <input
              type="text"
              name="access_code"
              value={redeemForm.access_code}
              onChange={handleRedeemChange}
              required
            />
          </label>
          <label>
            Share my pre-connection vitals history with this hospital?
            <select name="share_pre_connection_history" value={redeemForm.share_pre_connection_history} onChange={handleRedeemChange} required>
              <option value="" disabled>
                Choose one
              </option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <button type="submit" disabled={submittingRedeem}>
            {submittingRedeem ? 'Please wait…' : 'Connect'}
          </button>
        </form>
      </section>

      {/* --- Phase 2 --- */}
      <section>
        <h2>All Registered Hospitals</h2>
        <p>Browse every hospital on MaternIQ and search by name, area, district, or state.</p>
        <Link to="/patient/dashboard/hospitals/directory" className="btn-secondary">
          Browse hospitals
        </Link>
      </section>
    </main>
  )
}

export default HospitalManagementDashboard
