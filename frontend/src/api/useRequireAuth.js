import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken } from './auth'

export function useRequireAuth(role) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!getToken(role)) navigate(`/${role}`)
  }, [role, navigate])
}
