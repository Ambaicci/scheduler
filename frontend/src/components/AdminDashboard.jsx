import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../config'

export default function AdminDashboard({ user, onLogout }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [roster, setRoster] = useState([])
  const [employees, setEmployees] = useState([])
  const [exceptions, setExceptions] = useState([])
  const [swapRequests, setSwapRequests] = useState([])
  const [timeOffRequests, setTimeOffRequests] = useState([])
  const [activeTab, setActiveTab] = useState('roster')
  const [showCreateEmployee, setShowCreateEmployee] = useState(false)

  // New employee form
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    job_title: '',
    phone_number: '',
    max_hours_per_week: 45.0
  })

  // Fetch all data
  const fetchRoster = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/master-roster`)
      const data = await response.json()
      setRoster(data)
    } catch (err) {
      console.error("Failed to fetch roster:", err)
    }
  }

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/employees`)
      const data = await response.json()
      setEmployees(data)
    } catch (err) {
      console.error("Failed to fetch employees:", err)
    }
  }

  const fetchExceptions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/exceptions`)
      const data = await response.json()
      setExceptions(data)
    } catch (err) {
      console.error("Failed to fetch exceptions:", err)
    }
  }

  const fetchSwapRequests = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/swap-requests`)
      const data = await response.json()
      setSwapRequests(data)
    } catch (err) {
      console.error("Failed to fetch swap requests:", err)
    }
  }

  const fetchTimeOffRequests = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/time-off-requests`)
      const data = await response.json()
      setTimeOffRequests(data)
    } catch (err) {
      console.error("Failed to fetch time off requests:", err)
    }
  }

  useEffect(() => {
    fetchRoster()
    fetchEmployees()
    fetchExceptions()
    fetchSwapRequests()
    fetchTimeOffRequests()
  }, [])

  const handleGenerate = async () => {
    setLoading(true)
    setMessage('')
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-roster`, {
        method: 'POST',
      })
      
      if (!response.ok) throw new Error('Failed to generate roster')
      
      const data = await response.json()
      setMessage('✅ ' + data.message)
      fetchRoster()
    } catch (err) {
      setMessage('❌ Error: Could not connect to the scheduling engine.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEmployee = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmployee)
      })
      
      if (!response.ok) throw new Error('Failed to create employee')
      
      const data = await response.json()
      setMessage(`✅ ${data.message} Temporary Password: ${data.temporary_password}`)
      setShowCreateEmployee(false)
      setNewEmployee({ name: '', email: '', job_title: '', phone_number: '', max_hours_per_week: 45.0 })
      fetchEmployees()
    } catch (err) {
      setMessage('❌ ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleException = async (user_id, exception_type, reduced_hours) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/exceptions?user_id=${user_id}&exception_type=${exception_type}&start_date=${new Date().toISOString().split('T')[0]}&reduced_hours_per_week=${reduced_hours}`, {
        method: 'POST',
      })
      
      if (!response.ok) throw new Error('Failed to create exception')
      
      setMessage('✅ Exception created successfully')
      fetchExceptions()
    } catch (err) {
      setMessage('❌ ' + err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">🏥 Admin Portal</h1>
            <p className="text-xs text-gray-500">CHEBU Pharmacy · Powered by Coffeesoft</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">👋 Welcome, {user.name}</span>
            <button 
              onClick={onLogout}
              className="text-sm text-red-500 hover:text-red-700 font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('roster')}
            className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'roster' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            📋 Roster
          </button>
          <button 
            onClick={() => setActiveTab('employees')}
            className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'employees' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            👥 Employees
          </button>
          <button 
            onClick={() => setActiveTab('exceptions')}
            className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'exceptions' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            ⚠️ Exceptions
          </button>
          <button 
            onClick={() => setActiveTab('swaps')}
            className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'swaps' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            🔄 Shift Swaps
          </button>
          <button 
            onClick={() => setActiveTab('timeoff')}
            className={`px-4 py-2 rounded-lg font-medium transition ${activeTab === 'timeoff' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            🏖️ Time Off
          </button>
        </div>

        {/* Messages */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg border ${message.includes('❌') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
            {message}
          </div>
        )}

        {/* ROSTER TAB */}
        {activeTab === 'roster' && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">📋 Master Roster</h2>
              <button 
                onClick={handleGenerate}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {loading ? '⏳ Generating...' : '🤖 Generate Roster'}
              </button>
            </div>
            
            {roster.length === 0 ? (
              <p className="text-gray-500 text-sm">No roster generated yet. Click "Generate Roster" to create the schedule.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Date</th>
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Day</th>
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Employee</th>
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Role</th>
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Branch</th>
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Start</th>
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">End</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((shift, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-800 text-sm">{shift.date}</td>
                        <td className="py-3 px-4 text-gray-800 text-sm">{shift.day}</td>
                        <td className="py-3 px-4 text-gray-800 text-sm font-medium">{shift.user_name}</td>
                        <td className="py-3 px-4 text-gray-600 text-sm">{shift.role}</td>
                        <td className="py-3 px-4">
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            {shift.branch_name}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-800 text-sm">{shift.start_time}</td>
                        <td className="py-3 px-4 text-gray-800 text-sm">{shift.end_time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 text-sm text-gray-500">
                  Total shifts: {roster.length}
                </div>
              </div>
            )}
          </div>
        )}

        {/* EMPLOYEES TAB */}
        {activeTab === 'employees' && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">👥 Employee Management</h2>
              <button 
                onClick={() => setShowCreateEmployee(!showCreateEmployee)}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 font-medium"
              >
                {showCreateEmployee ? 'Cancel' : '+ Add Employee'}
              </button>
            </div>

            {/* Create Employee Form */}
            {showCreateEmployee && (
              <form onSubmit={handleCreateEmployee} className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                    className="px-3 py-2 border rounded-md"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                    className="px-3 py-2 border rounded-md"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Job Title (e.g., Pharmacist)"
                    value={newEmployee.job_title}
                    onChange={(e) => setNewEmployee({...newEmployee, job_title: e.target.value})}
                    className="px-3 py-2 border rounded-md"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Phone Number"
                    value={newEmployee.phone_number}
                    onChange={(e) => setNewEmployee({...newEmployee, phone_number: e.target.value})}
                    className="px-3 py-2 border rounded-md"
                  />
                  <input
                    type="number"
                    placeholder="Max Hours/Week"
                    value={newEmployee.max_hours_per_week}
                    onChange={(e) => setNewEmployee({...newEmployee, max_hours_per_week: parseFloat(e.target.value)})}
                    className="px-3 py-2 border rounded-md"
                    step="0.5"
                  />
                </div>
                <button type="submit" className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  Create Employee
                </button>
              </form>
            )}

            {/* Employee List */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="py-3 px-4 font-medium text-gray-600 text-sm">ID</th>
                    <th className="py-3 px-4 font-medium text-gray-600 text-sm">Name</th>
                    <th className="py-3 px-4 font-medium text-gray-600 text-sm">Email</th>
                    <th className="py-3 px-4 font-medium text-gray-600 text-sm">Role</th>
                    <th className="py-3 px-4 font-medium text-gray-600 text-sm">Max Hours</th>
                    <th className="py-3 px-4 font-medium text-gray-600 text-sm">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.filter(e => e.role === 'EMPLOYEE').map((emp) => (
                    <tr key={emp.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-mono">{emp.employee_id}</td>
                      <td className="py-3 px-4 text-sm font-medium">{emp.name}</td>
                      <td className="py-3 px-4 text-sm">{emp.email}</td>
                      <td className="py-3 px-4 text-sm">{emp.job_title}</td>
                      <td className="py-3 px-4 text-sm">{emp.max_hours_per_week}h</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${emp.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {emp.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* EXCEPTIONS TAB */}
        {activeTab === 'exceptions' && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4">⚠️ Employee Exceptions</h2>
            {exceptions.length === 0 ? (
              <p className="text-gray-500 text-sm">No active exceptions.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Employee</th>
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Type</th>
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Start Date</th>
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">End Date</th>
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Reduced Hours</th>
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exceptions.map((ex) => (
                      <tr key={ex.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-medium">{ex.user_name}</td>
                        <td className="py-3 px-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${ex.exception_type === 'SICK' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {ex.exception_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">{ex.start_date}</td>
                        <td className="py-3 px-4 text-sm">{ex.end_date || 'Ongoing'}</td>
                        <td className="py-3 px-4 text-sm">{ex.reduced_hours_per_week || '-'}h</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${ex.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {ex.is_active ? 'Active' : 'Resolved'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SWAPS TAB */}
        {activeTab === 'swaps' && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4">🔄 Shift Swap Requests</h2>
            {swapRequests.length === 0 ? (
              <p className="text-gray-500 text-sm">No pending swap requests.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Requesting</th>
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Target</th>
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Date</th>
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {swapRequests.map((req) => (
                      <tr key={req.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-medium">{req.requesting_user}</td>
                        <td className="py-3 px-4 text-sm">{req.target_user}</td>
                        <td className="py-3 px-4 text-sm">{req.assignment_date}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 
                            req.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 
                            'bg-red-100 text-red-800'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TIME OFF TAB */}
        {activeTab === 'timeoff' && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4">🏖️ Time Off Requests</h2>
            {timeOffRequests.length === 0 ? (
              <p className="text-gray-500 text-sm">No pending time off requests.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Employee</th>
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Start</th>
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">End</th>
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Reason</th>
                      <th className="py-3 px-4 font-medium text-gray-600 text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeOffRequests.map((req) => (
                      <tr key={req.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-medium">{req.user_name}</td>
                        <td className="py-3 px-4 text-sm">{req.start_date}</td>
                        <td className="py-3 px-4 text-sm">{req.end_date}</td>
                        <td className="py-3 px-4 text-sm">{req.reason}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 
                            req.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 
                            'bg-red-100 text-red-800'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}