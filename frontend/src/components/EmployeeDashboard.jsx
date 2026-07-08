import { useState, useEffect } from 'react'
import { API_BASE_URL } from '../config'

export default function EmployeeDashboard({ user, onLogout }) {
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch the logged-in employee's schedule from the Python backend
    fetch(`${API_BASE_URL}/api/my-schedule/${user.user_id}`)
      .then(res => res.json())
      .then(data => {
        setSchedule(data)
        setLoading(false)
      })
      .catch(err => {
        console.error("Failed to fetch schedule:", err)
        setLoading(false)
      })
  }, [user.user_id])

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Staff Portal</h1>
            <p className="text-xs text-gray-500">Powered by Coffeesoft</p>
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
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">My Weekly Schedule</h2>
          
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
                    <th className="py-3 px-4 font-medium text-gray-600">Start Time</th>
                    <th className="py-3 px-4 font-medium text-gray-600">End Time</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((shift, index) => (
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