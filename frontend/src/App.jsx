import { Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing'
import DoctorDirectory from './pages/DoctorDirectory'
import PatientAuth from './pages/patient/PatientAuth'
import PatientCompleteProfile from './pages/patient/CompleteProfile'
import PatientDashboard from './pages/patient/PatientDashboard'
import LifestyleDashboard from './pages/patient/LifestyleDashboard'
import HospitalManagementDashboard from './pages/patient/HospitalManagementDashboard'
import DoctorAuth from './pages/doctor/DoctorAuth'
import DoctorCompleteProfile from './pages/doctor/CompleteProfile'
import DoctorDashboard from './pages/doctor/DoctorDashboard'
import HospitalAuth from './pages/hospital/HospitalAuth'
import HospitalDashboard from './pages/hospital/HospitalDashboard'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      {/* --- Phase 2 --- */}
      <Route path="/doctors" element={<DoctorDirectory />} />
      <Route path="/patient" element={<PatientAuth />} />
      <Route path="/patient/complete-profile" element={<PatientCompleteProfile />} />
      <Route path="/patient/dashboard" element={<PatientDashboard />} />
      <Route path="/patient/dashboard/lifestyle" element={<LifestyleDashboard />} />
      <Route path="/patient/dashboard/hospitals" element={<HospitalManagementDashboard />} />
      <Route path="/doctor" element={<DoctorAuth />} />
      <Route path="/doctor/complete-profile" element={<DoctorCompleteProfile />} />
      <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
      <Route path="/hospital" element={<HospitalAuth />} />
      <Route path="/hospital/dashboard" element={<HospitalDashboard />} />
    </Routes>
  )
}

export default App
