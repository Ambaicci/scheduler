import { useState, useEffect } from 'react';
import { 
  CalendarIcon, 
  ClockIcon,
  ArrowRightOnRectangleIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowsRightLeftIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

const EmployeeDashboard = ({ user, onLogout }) => {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekView, setWeekView] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showTeamView, setShowTeamView] = useState(false);
  const [teamRoster, setTeamRoster] = useState([]);
  const [activeView, setActiveView] = useState('mySchedule');
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [targetEmployee, setTargetEmployee] = useState('');
  const [swapNotes, setSwapNotes] = useState('');
  const [timeOffReason, setTimeOffReason] = useState('VACATION');
  const [timeOffStart, setTimeOffStart] = useState('');
  const [timeOffEnd, setTimeOffEnd] = useState('');
  const [timeOffNotes, setTimeOffNotes] = useState('');
  const [swapRequests, setSwapRequests] = useState([]);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    fetchSchedule();
    fetchTeamRoster();
    fetchEmployees();
    fetchSwapRequests();
  }, []);

  const fetchSchedule = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/my-schedule/${user.user_id}`);
      const data = await response.json();
      setSchedule(data);
      
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const grouped = days.map(day => {
        const shifts = data.filter(s => s.day === day);
        return { day, shifts };
      });
      setWeekView(grouped);
    } catch (err) {
      console.error('Failed to fetch schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamRoster = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/master-roster');
      const data = await response.json();
      setTeamRoster(data);
    } catch (err) {
      console.error('Failed to fetch team roster:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/admin/employees');
      const data = await response.json();
      setEmployees(data.filter(e => e.id !== user.user_id && e.is_active));
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  const fetchSwapRequests = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/swap-requests');
      const data = await response.json();
      setSwapRequests(data);
    } catch (err) {
      console.error('Failed to fetch swap requests:', err);
    }
  };

  const handleSwapRequest = async () => {
    if (!selectedAssignment || !targetEmployee) {
      alert('Please select a shift and an employee');
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/swap-request?requesting_user_id=${user.user_id}&target_user_id=${targetEmployee}&assignment_id=${selectedAssignment}&notes=${swapNotes}`,
        { method: 'POST' }
      );
      const data = await response.json();
      if (data.success) {
        alert(data.message);
        setShowSwapModal(false);
        setSelectedAssignment(null);
        setTargetEmployee('');
        setSwapNotes('');
        fetchSwapRequests();
      }
    } catch (err) {
      alert('Error creating swap request');
    }
  };

  const handleTimeOffRequest = async () => {
    if (!timeOffStart || !timeOffEnd) {
      alert('Please select start and end dates');
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/time-off-request?user_id=${user.user_id}&start_date=${timeOffStart}&end_date=${timeOffEnd}&reason=${timeOffReason}&notes=${timeOffNotes}`,
        { method: 'POST' }
      );
      const data = await response.json();
      if (data.success) {
        alert(data.message);
        setShowTimeOffModal(false);
        setTimeOffStart('');
        setTimeOffEnd('');
        setTimeOffReason('VACATION');
        setTimeOffNotes('');
      }
    } catch (err) {
      alert('Error creating time off request');
    }
  };

  const getBranchColor = (branchName) => {
    if (branchName?.includes('Sabatia')) return 'bg-green-500';
    if (branchName?.includes('Navakholo')) return 'bg-purple-500';
    if (branchName?.includes('Wholesale')) return 'bg-indigo-500';
    return 'bg-blue-500';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-600 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-800">My Schedule</h1>
                <p className="text-xs text-gray-500">{user.name}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 py-4">
        {/* View Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveView('mySchedule')}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
              activeView === 'mySchedule'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-white text-gray-600'
            }`}
          >
            📅 My Schedule
          </button>
          <button
            onClick={() => setActiveView('teamView')}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
              activeView === 'teamView'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-white text-gray-600'
            }`}
          >
            👥 Team View
          </button>
        </div>

        {/* My Schedule View */}
        {activeView === 'mySchedule' && (
          <>
            {/* Action Buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setShowSwapModal(true)}
                className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-xl text-sm font-medium flex items-center justify-center gap-1"
              >
                <ArrowsRightLeftIcon className="w-4 h-4" />
                Swap Shift
              </button>
              <button
                onClick={() => setShowTimeOffModal(true)}
                className="flex-1 bg-purple-600 text-white py-2 px-3 rounded-xl text-sm font-medium flex items-center justify-center gap-1"
              >
                <CalendarDaysIcon className="w-4 h-4" />
                Time Off
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                <p className="text-gray-500 text-sm mt-2">Loading your schedule...</p>
              </div>
            ) : schedule.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center">
                <p className="text-gray-500 font-medium">No shifts this week</p>
                <p className="text-xs text-gray-400 mt-1">Your manager will generate the roster soon</p>
              </div>
            ) : (
              <div className="space-y-3">
                {weekView.map((day, idx) => {
                  const shifts = day.shifts;
                  const isToday = day.day === new Date().toLocaleDateString('en-US', { weekday: 'long' });
                  
                  return (
                    <div key={idx} className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
                      isToday ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-100'
                    }`}>
                      <div className={`px-4 py-3 flex justify-between items-center ${
                        isToday ? 'bg-blue-50' : 'bg-gray-50'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold text-sm ${isToday ? 'text-blue-700' : 'text-gray-800'}`}>
                            {day.day}
                          </span>
                          {isToday && (
                            <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded-full">Today</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {shifts.length === 0 ? 'Off' : `${shifts.length} shift${shifts.length > 1 ? 's' : ''}`}
                        </span>
                      </div>
                      
                      {shifts.length === 0 ? (
                        <div className="px-4 py-3 text-center">
                          <span className="text-xs text-gray-400">— Day Off —</span>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {shifts.map((shift, shiftIdx) => (
                            <div key={shiftIdx} className="px-4 py-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-1.5 h-8 rounded-full ${getBranchColor(shift.branch)}`}></div>
                                <div>
                                  <div className="text-sm font-medium text-gray-800">{shift.branch}</div>
                                  <div className="text-xs text-gray-500 flex items-center gap-1">
                                    <ClockIcon className="w-3 h-3" />
                                    <span>{shift.start_time} – {shift.end_time}</span>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedAssignment(shift.id);
                                  setShowSwapModal(true);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                Swap
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Summary Card */}
            {schedule.length > 0 && (
              <div className="mt-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 text-white">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-blue-100">Total Shifts</p>
                    <p className="text-2xl font-bold">{schedule.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-100">Working Days</p>
                    <p className="text-2xl font-bold">{new Set(schedule.map(s => s.date)).size}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-blue-100">Employee ID</p>
                    <p className="text-xs font-mono bg-white/20 px-3 py-1 rounded-lg">{user.employee_id || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Team View */}
        {activeView === 'teamView' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">📋 Team Roster</h3>
            
            {teamRoster.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No roster generated yet</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(
                  teamRoster.reduce((acc, shift) => {
                    if (!acc[shift.date]) acc[shift.date] = [];
                    acc[shift.date].push(shift);
                    return acc;
                  }, {})
                ).map(([date, shifts]) => (
                  <div key={date} className="border border-gray-100 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2">
                      <span className="text-xs font-medium text-gray-600">
                        {date} ({shifts[0]?.day || ''})
                      </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {shifts.map((shift, idx) => (
                        <div key={idx} className="px-3 py-2 flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${getBranchColor(shift.branch_name)}`}></span>
                            <span className="text-gray-700">{shift.user_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="bg-gray-100 px-2 py-0.5 rounded">{shift.branch_name}</span>
                            <span>{shift.start_time}–{shift.end_time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Swap Shift Modal */}
      {showSwapModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Swap Shift</h3>
              <button
                onClick={() => {
                  setShowSwapModal(false);
                  setSelectedAssignment(null);
                  setTargetEmployee('');
                  setSwapNotes('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Employee to Swap With</label>
                <select
                  value={targetEmployee}
                  onChange={(e) => setTargetEmployee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={swapNotes}
                  onChange={(e) => setSwapNotes(e.target.value)}
                  placeholder="Any special instructions..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
                />
              </div>

              <button
                onClick={handleSwapRequest}
                className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition-all font-medium text-sm"
              >
                Send Swap Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Off Modal */}
      {showTimeOffModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Request Time Off</h3>
              <button
                onClick={() => setShowTimeOffModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <select
                  value={timeOffReason}
                  onChange={(e) => setTimeOffReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="VACATION">Vacation</option>
                  <option value="SICK">Sick</option>
                  <option value="PERSONAL">Personal</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={timeOffStart}
                    onChange={(e) => setTimeOffStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={timeOffEnd}
                    onChange={(e) => setTimeOffEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={timeOffNotes}
                  onChange={(e) => setTimeOffNotes(e.target.value)}
                  placeholder="Any additional details..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
                />
              </div>

              <button
                onClick={handleTimeOffRequest}
                className="w-full bg-purple-600 text-white py-3 rounded-xl hover:bg-purple-700 transition-all font-medium text-sm"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;