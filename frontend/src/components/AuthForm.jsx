import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../api/config'
import { saveAuth } from '../api/auth'
import './AuthForm.css'

const EMPTY_FORM = { full_name: '', email: '', password: '' }

function AuthForm({ role, title }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setInfo('')
    setSubmitting(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/${role}/${mode}`, {
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
        setInfo('Account created. You can log in now.')
        setForm(EMPTY_FORM)
        setMode('login')
      } else {
        saveAuth(role, { token: data.access_token, id: data[`${role}_id`] })
        navigate(`/${role}/dashboard`)
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
      <h1>{title}</h1>

      <div className="mode-toggle">
        <button
          type="button"
          className={mode === 'login' ? 'active' : ''}
          onClick={() => {
            setMode('login')
            setError('')
            setInfo('')
          }}
        >
          Login
        </button>
        <button
          type="button"
          className={mode === 'register' ? 'active' : ''}
          onClick={() => {
            setMode('register')
            setError('')
            setInfo('')
          }}
        >
          Register
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}
      {info && <p className="form-info">{info}</p>}

      <form onSubmit={handleSubmit} className="auth-form">
        {mode === 'register' && (
          <label>
            Full name
            <input type="text" name="full_name" value={form.full_name} onChange={handleChange} required />
          </label>
        )}
        <label>
          Email
          <input type="email" name="email" value={form.email} onChange={handleChange} required />
        </label>
        <label>
          Password
          <input type="password" name="password" value={form.password} onChange={handleChange} required />
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? 'Please wait…' : mode === 'login' ? 'Login' : 'Register'}
        </button>
      </form>
    </main>
  )
}

export default AuthForm
