import { Link } from 'react-router-dom'

function ComingSoon({ title }) {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', textAlign: 'center', padding: '2rem' }}>
      <h1>{title}</h1>
      <p>Register/login for this profile is coming next.</p>
      <Link to="/">Back to landing page</Link>
    </main>
  )
}

export default ComingSoon
