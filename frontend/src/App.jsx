import { Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing'
import ComingSoon from './pages/ComingSoon'
import PatientAuth from './pages/patient/PatientAuth'
import PatientDashboard from './pages/patient/PatientDashboard'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/patient" element={<PatientAuth />} />
      <Route path="/patient/dashboard" element={<PatientDashboard />} />
      <Route path="/doctor" element={<ComingSoon title="Doctor" />} />
      <Route path="/hospital" element={<ComingSoon title="Hospital" />} />
    </Routes>
  )
}

export default App
