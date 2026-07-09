import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../config'

export default function EmployeeDashboard({ user, onLogout }) {
  const [schedule, setSchedule] = useState([])
  const [fullRoster, setFullRoster] = useState([])
  const [loading, setLoading] = useState(true)
  const [showFullRoster, setShowFullRoster] = useState(false)

  useEffect(() => {
    fetchSchedule()
  }, [user.user_id])

  const fetchSchedule = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/my-schedule/${user.user_id}`)
      const data = await response.json()
      setSchedule(data)
    } catch (err) {
      console.error("Failed to fetch schedule:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchFullRoster = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/master-roster`)
      const data = await response.json()
      setFullRoster(data)
      setShowFullRoster(!showFullRoster)
    } catch (err) {
      console.error("Failed to fetch full roster:", err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">👤 Staff Portal</h1>
            <p className="text-xs text-gray-500">Powered by Coffeesoft</p>
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
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800">📅 My Weekly Schedule</h2>
            <button 
              onClick={fetchFullRoster}
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
            >
              {showFullRoster ? 'Hide Full Roster' : '📋 View Full Roster'}
            </button>
          </div>
          
          {loading ? (
            <p className="text-gray-500 text-center py-4">Loading your schedule...</p>
          ) : schedule.length === 0 ? (
            <div className="border rounded-md p-4 text-center text-gray-500">
              <p className="font-medium">No shifts scheduled yet.</p>
              <p className="text-sm mt-1">Your manager has not generated the roster for this week.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="py-3 px-4 font-medium text-gray-600">Date</th>
                    <th className="py-3 px-4 font-medium text-gray-600">Day</th>
                    <th className="py-3 px-4 font-medium text-gray-600">Branch</th>
                    <th className="py-3 px-4 font-medium text-gray-600">Start</th>
                    <th className="py-3 px-4 font-medium text-gray-600">End</th>
                    <th className="py-3 px-4 font-medium text-gray-600">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((shift, index) => {
                    const start = parseInt(shift.start_time.split(':')[0])
                    const end = parseInt(shift.end_time.split(':')[0])
                    const hours = end - start
                    return (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-800">{shift.date}</td>
                        <td className="py-3 px-4 text-gray-800">{shift.day}</td>
                        <td className="py-3 px-4">
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            {shift.branch}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-800">{shift.start_time}</td>
                        <td className="py-3 px-4 text-gray-800">{shift.end_time}</td>
                        <td className="py-3 px-4 text-gray-800">{hours}h</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="mt-4 text-sm text-gray-500">
                Total shifts this week: {schedule.length}
              </div>
            </div>
          )}
        </div>

        {/* Full Roster View */}
        {showFullRoster && fullRoster.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-sm mt-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">📋 Full Weekly Roster</h3>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="border-b">
                    <th className="py-2 px-3 font-medium text-gray-600 text-xs">Date</th>
                    <th className="py-2 px-3 font-medium text-gray-600 text-xs">Employee</th>
                    <th className="py-2 px-3 font-medium text-gray-600 text-xs">Role</th>
                    <th className="py-2 px-3 font-medium text-gray-600 text-xs">Branch</th>
                    <th className="py-2 px-3 font-medium text-gray-600 text-xs">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {fullRoster.map((shift, index) => (
                    <tr key={index} className={`border-b hover:bg-gray-50 ${shift.user_name === user.name ? 'bg-blue-50' : ''}`}>
                      <td className="py-2 px-3 text-xs">{shift.date}</td>
                      <td className={`py-2 px-3 text-xs font-medium ${shift.user_name === user.name ? 'text-blue-600' : ''}`}>
                        {shift.user_name}
                        {shift.user_name === user.name && ' ⭐'}
                      </td>
                      <td className="py-2 px-3 text-xs">{shift.role}</td>
                      <td className="py-2 px-3 text-xs">
                        <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs">
                          {shift.branch_name}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs">{shift.start_time} - {shift.end_time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}