import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../config'

export default function AdminDashboard({ user, onLogout }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [roster, setRoster] = useState([])

  // Fetch the master roster from the backend
  const fetchRoster = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/master-roster`)
      const data = await response.json()
      setRoster(data)
    } catch (err) {
      console.error("Failed to fetch master roster:", err)
    }
  }

  // Load roster when the page loads
  useEffect(() => {
    fetchRoster()
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
      setMessage(data.message)
      fetchRoster() // Refresh the grid immediately after generation
    } catch (err) {
      setMessage('Error: Could not connect to the scheduling engine.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Admin Portal</h1>
            <p className="text-xs text-gray-500">CHEBU Pharmacy · Powered by Coffeesoft</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Welcome, {user.name}</span>
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
        {/* Generation Engine Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Roster Management</h2>
          <button 
            onClick={handleGenerate}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {loading ? '🤖 Generating...' : '🤖 Autonomously Generate Roster'}
          </button>
          
          {message && (
            <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-md border border-green-200 text-sm">
              {message}
            </div>
          )}
        </div>

        {/* Master Roster Grid Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Master Roster Sheet</h2>
          {roster.length === 0 ? (
            <p className="text-gray-500 text-sm">No roster generated yet. Click the button above to let the AI generate the schedule.</p>
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
                    <th className="py-3 px-4 font-medium text-gray-600 text-sm">Start Time</th>
                    <th className="py-3 px-4 font-medium text-gray-600 text-sm">End Time</th>
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
            </div>
          )}
        </div>
      </main>
    </div>
  )
}