import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE_URL } from './config'
import { clearAuth, getToken } from './auth'

export function useProtectedProfile(role) {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = getToken(role)
    if (!token) {
      navigate(`/${role}`)
      return
    }

    fetch(`${API_BASE_URL}/api/${role}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Session expired')
        setData(body)
      })
      .catch((err) => {
        setError(err.message)
        clearAuth(role)
        setTimeout(() => navigate(`/${role}`), 1500)
      })
  }, [role, navigate])

  return { data, error }
}
