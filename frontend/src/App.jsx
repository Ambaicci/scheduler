import { useState } from 'react'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import EmployeeDashboard from './pages/EmployeeDashboard'

function App() {
  const [user, setUser] = useState(() => {
    // Check localStorage for existing session
    const token = localStorage.getItem('access_token')
    const role = localStorage.getItem('user_role')
    const name = localStorage.getItem('user_name')
    const userId = localStorage.getItem('user_id')
    const employeeId = localStorage.getItem('employee_id')
    
    if (token && role) {
      return { 
        role, 
        name, 
        user_id: parseInt(userId),
        employee_id: employeeId,
        access_token: token 
      }
    }
    return null
  })

  const handleLogin = (userData) => {
    // Store in localStorage
    localStorage.setItem('access_token', userData.access_token)
    localStorage.setItem('user_role', userData.role)
    localStorage.setItem('user_id', userData.user_id)
    localStorage.setItem('user_name', userData.name)
    localStorage.setItem('employee_id', userData.employee_id || '')
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user_role')
    localStorage.removeItem('user_id')
    localStorage.removeItem('user_name')
    localStorage.removeItem('employee_id')
    setUser(null)
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  if (user.role === 'ADMIN') {
    return <AdminDashboard user={user} onLogout={handleLogout} />
  }

  return <EmployeeDashboard user={user} onLogout={handleLogout} />
}

export default App