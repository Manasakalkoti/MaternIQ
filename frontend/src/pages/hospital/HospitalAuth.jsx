import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../../api/config'
import { saveAuth } from '../../api/auth'
import '../../components/AuthForm.css'

const EMPTY_LOGIN = { email: '', password: '' }
const EMPTY_REGISTER = {
  name: '',
  email: '',
  password: '',
  address: '',
  pincode: '',
  area: '',
  district: '',
  state: '',
}

const PINCODE_PATTERN = /^\d{6}$/

function HospitalAuth() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [loginForm, setLoginForm] = useState(EMPTY_LOGIN)
  const [registerForm, setRegisterForm] = useState(EMPTY_REGISTER)
  const [pincodeError, setPincodeError] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setError('')
    setInfo('')
    setPincodeError('')
  }

  const handleLoginChange = (event) => {
    const { name, value } = event.target
    setLoginForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleRegisterChange = (event) => {
    const { name, value } = event.target
    setRegisterForm((prev) => ({ ...prev, [name]: value }))
    if (name === 'pincode') {
      setPincodeError(value && !PINCODE_PATTERN.test(value) ? 'Pincode must be exactly 6 digits' : '')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')

    const form = mode === 'login' ? loginForm : registerForm

    if (mode === 'register' && !PINCODE_PATTERN.test(registerForm.pincode)) {
      setPincodeError('Pincode must be exactly 6 digits')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/hospital/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Something went wrong')
        return
      }

      if (mode === 'register') {
        setInfo('Hospital account created. You can log in now.')
        setRegisterForm(EMPTY_REGISTER)
        switchMode('login')
      } else {
        saveAuth('hospital', { token: data.access_token, id: data.hospital_id })
        navigate('/hospital/dashboard')
      }
    } catch {
      setError('Could not reach the server. Is the backend running?')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <Link to="/">Back to landing page</Link>
      <h1>Hospital</h1>

      <div className="mode-toggle">
        <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>
          Login
        </button>
        <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>
          Register
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}
      {info && <p className="form-info">{info}</p>}

      {mode === 'login' ? (
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <input type="email" name="email" value={loginForm.email} onChange={handleLoginChange} required />
          </label>
          <label>
            Password
            <input type="password" name="password" value={loginForm.password} onChange={handleLoginChange} required />
          </label>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Please wait…' : 'Login'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Hospital name
            <input type="text" name="name" value={registerForm.name} onChange={handleRegisterChange} required />
          </label>
          <label>
            Email
            <input type="email" name="email" value={registerForm.email} onChange={handleRegisterChange} required />
          </label>
          <label>
            Password
            <input type="password" name="password" value={registerForm.password} onChange={handleRegisterChange} required />
          </label>
          <label>
            Address
            <input type="text" name="address" value={registerForm.address} onChange={handleRegisterChange} required />
          </label>
          <label>
            Pincode
            <input
              type="text"
              name="pincode"
              value={registerForm.pincode}
              onChange={handleRegisterChange}
              inputMode="numeric"
              maxLength={6}
              required
            />
          </label>
          {pincodeError && <p className="form-error">{pincodeError}</p>}
          <label>
            Area
            <input type="text" name="area" value={registerForm.area} onChange={handleRegisterChange} required />
          </label>
          <label>
            District
            <input type="text" name="district" value={registerForm.district} onChange={handleRegisterChange} required />
          </label>
          <label>
            State
            <input type="text" name="state" value={registerForm.state} onChange={handleRegisterChange} required />
          </label>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Please wait…' : 'Register'}
          </button>
        </form>
      )}
    </main>
  )
}

export default HospitalAuth
