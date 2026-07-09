import { useState, useEffect } from 'react';
import { 
  UserPlusIcon, 
  UserGroupIcon, 
  CalendarIcon, 
  ArrowRightOnRectangleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  XMarkIcon,
  ArrowsRightLeftIcon,
  CalendarDaysIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { API_BASE_URL } from '../config'; // <-- IMPORTED API URL

const AdminDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('roster');
  const [employees, setEmployees] = useState([]);
  const [roster, setRoster] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [swapRequests, setSwapRequests] = useState([]);
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [days, setDays] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [exceptionType, setExceptionType] = useState('PREGNANCY');
  const [reducedHours, setReducedHours] = useState('');
  const [exceptionNotes, setExceptionNotes] = useState('');
  const [exceptionStartDate, setExceptionStartDate] = useState('');
  const [exceptionEndDate, setExceptionEndDate] = useState('');
  const [schedulerStatus, setSchedulerStatus] = useState('idle');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/employees`);
      const data = await response.json();
      setEmployees(data);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  const fetchRoster = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/master-roster`);
      const data = await response.json();
      setRoster(data);
    } catch (err) {
      console.error('Failed to fetch roster:', err);
    }
  };

  const fetchExceptions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/exceptions`);
      const data = await response.json();
      setExceptions(data);
    } catch (err) {
      console.error('Failed to fetch exceptions:', err);
    }
  };

  const fetchSwapRequests = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/swap-requests`);
      const data = await response.json();
      setSwapRequests(data);
    } catch (err) {
      console.error('Failed to fetch swap requests:', err);
    }
  };

  const fetchTimeOffRequests = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/time-off-requests`);
      const data = await response.json();
      setTimeOffRequests(data);
    } catch (err) {
      console.error('Failed to fetch time off requests:', err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchRoster();
    fetchExceptions();
    fetchSwapRequests();
    fetchTimeOffRequests();
    checkSchedulerStatus();
  }, []);

  const checkSchedulerStatus = () => {
    const now = new Date();
    const isSunday = now.getDay() === 0;
    const isAfter8am = now.getHours() >= 8;
    setSchedulerStatus(isSunday && isAfter8am ? 'running' : 'idle');
  };

  const generateRoster = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-roster`, {
        method: 'POST',
      });
      const data = await response.json();
      setMessage(data.message || 'Roster generated successfully!');
      fetchRoster();
      fetchEmployees();
    } catch (err) {
      setMessage('Error generating roster. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createException = async () => {
    if (!selectedEmployee) {
      alert('Please select an employee');
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/exceptions?user_id=${selectedEmployee}&exception_type=${exceptionType}&start_date=${exceptionStartDate}&end_date=${exceptionEndDate}&reduced_hours_per_week=${reducedHours}&notes=${exceptionNotes}`,
        { method: 'POST' }
      );
      const data = await response.json();
      if (data.success) {
        setMessage(`✅ ${data.message}`);
        fetchExceptions();
        fetchEmployees();
        setShowExceptionModal(false);
        resetExceptionForm();
      }
    } catch (err) {
      setMessage('Error creating exception');
    }
  };

  const resetExceptionForm = () => {
    setSelectedEmployee('');
    setExceptionType('PREGNANCY');
    setReducedHours('');
    setExceptionNotes('');
    setExceptionStartDate('');
    setExceptionEndDate('');
  };

  const handleSwapRequest = async (requestId, status) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/swap-request/${requestId}?status=${status}`,
        { method: 'PUT' }
      );
      const data = await response.json();
      if (data.success) {
        setMessage(`✅ ${data.message}`);
        fetchSwapRequests();
        fetchRoster();
      }
    } catch (err) {
      setMessage('Error updating swap request');
    }
  };

  const handleTimeOffRequest = async (requestId, status) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/time-off-request/${requestId}?status=${status}`,
        { method: 'PUT' }
      );
      const data = await response.json();
      if (data.success) {
        setMessage(`✅ ${data.message}`);
        fetchTimeOffRequests();
      }
    } catch (err) {
      setMessage('Error updating time off request');
    }
  };

  const updateEmployee = async () => {
    if (!editingEmployee) return;
    
    try {
      const params = new URLSearchParams();
      Object.keys(editingEmployee).forEach(key => {
        if (editingEmployee[key] !== undefined && editingEmployee[key] !== null && key !== 'id') {
          params.append(key, editingEmployee[key]);
        }
      });
      
      const response = await fetch(
        `${API_BASE_URL}/api/admin/employees/${editingEmployee.id}?${params.toString()}`,
        { method: 'PUT' }
      );
      const data = await response.json();
      if (data.success) {
        setMessage(`✅ ${data.message}`);
        fetchEmployees();
        setShowEditModal(false);
        setEditingEmployee(null);
      }
    } catch (err) {
      setMessage('Error updating employee');
    }
  };

  const getBranchColor = (branchName) => {
    if (branchName?.includes('Sabatia')) return 'bg-[#34C759]';
    if (branchName?.includes('Navakholo')) return 'bg-[#AF52DE]';
    if (branchName?.includes('Wholesale')) return 'bg-[#FF9500]';
    return 'bg-[#007AFF]';
  };

  const getExceptionBadge = (type) => {
    const colors = {
      'PREGNANCY': 'bg-[#AF52DE]/12 text-[#AF52DE]',
      'SICK': 'bg-[#FF3B30]/12 text-[#FF3B30]',
      'LEAVE': 'bg-[#FF9500]/12 text-[#FF9500]',
      'PART_TIME': 'bg-[#FF2D55]/12 text-[#FF2D55]'
    };
    return colors[type] || 'bg-[#8E8E93]/12 text-[#8E8E93]';
  };

  const getStatusBadge = (status) => {
    const colors = {
      'PENDING': 'bg-[#FF9500]/12 text-[#FF9500]',
      'APPROVED': 'bg-[#34C759]/12 text-[#34C759]',
      'REJECTED': 'bg-[#FF3B30]/12 text-[#FF3B30]',
      'CANCELLED': 'bg-[#8E8E93]/12 text-[#8E8E93]'
    };
    return colors[status] || 'bg-[#8E8E93]/12 text-[#8E8E93]';
  };

  const tabs = [
    { id: 'roster', label: 'Roster', icon: CalendarIcon },
    { id: 'employees', label: 'Staff', icon: UsersIcon },
    { id: 'exceptions', label: 'Exceptions', icon: ExclamationTriangleIcon, badge: exceptions.length },
    { id: 'swaps', label: 'Swaps', icon: ArrowsRightLeftIcon, badge: swapRequests.length },
    { id: 'timeoff', label: 'Time Off', icon: CalendarDaysIcon, badge: timeOffRequests.length },
  ];

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-20">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-xl border-b border-[#E5E5EA] sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#007AFF] rounded-xl flex items-center justify-center shadow-lg shadow-[#007AFF]/20">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-base font-bold text-[#1C1C1E]">CHEBU</h1>
                <p className="text-xs text-[#8E8E93]">Admin</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-[#3A3A3C] hidden sm:block">{user.name}</span>
              <button
                onClick={onLogout}
                className="text-sm text-[#FF3B30] font-medium hover:opacity-70 transition-opacity"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="px-4 py-4 max-w-7xl mx-auto">
        {/* Status Banner */}
        <div className={`mb-4 p-3 rounded-xl text-sm flex items-center justify-between ${
          schedulerStatus === 'running' ? 'bg-[#34C759]/10 border border-[#34C759]/20' : 'bg-[#007AFF]/10 border border-[#007AFF]/20'
        }`}>
          <div className="flex items-center gap-2">
            {schedulerStatus === 'running' ? (
              <CheckCircleIcon className="w-4 h-4 text-[#34C759]" />
            ) : (
              <ClockIcon className="w-4 h-4 text-[#007AFF]" />
            )}
            <span className={schedulerStatus === 'running' ? 'text-[#34C759]' : 'text-[#007AFF]'}>
              {schedulerStatus === 'running' ? '🔄 Auto-generating (Sundays 8AM)' : '⏰ Auto-gen: Sundays 8AM'}
            </span>
          </div>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm ${
            message.includes('success') || message.includes('✅')
              ? 'bg-[#34C759]/10 border border-[#34C759]/20 text-[#34C759]'
              : 'bg-[#FF9500]/10 border border-[#FF9500]/20 text-[#FF9500]'
          }`}>
            {message}
          </div>
        )}

        {/* Roster Tab */}
        {activeTab === 'roster' && (
          <div className="space-y-4">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50 p-5">
              <h2 className="text-sm font-semibold text-[#1C1C1E] mb-3">Generate Weekly Roster</h2>
              <button
                onClick={generateRoster}
                disabled={loading}
                className="w-full bg-[#007AFF] text-white py-3 rounded-xl hover:opacity-85 active:scale-[0.98] transition-all font-medium text-sm disabled:opacity-50 shadow-lg shadow-[#007AFF]/25"
              >
                {loading ? 'Generating...' : 'Generate Roster'}
              </button>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50 p-5 overflow-x-auto">
              <h2 className="text-sm font-semibold text-[#1C1C1E] mb-3">📋 Master Roster</h2>
              
              {roster.length === 0 ? (
                <div className="text-center py-8 bg-[#F2F2F7] rounded-xl">
                  <p className="text-[#8E8E93] text-sm font-medium">No roster generated yet</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2 mb-3 text-xs">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#007AFF]"></span> Mumias</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#34C759]"></span> Sabatia</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#AF52DE]"></span> Navakholo</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#FF9500]"></span> Wholesale</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#C7C7CC]"></span> Off</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#F2F2F7]">
                          <th className="px-2 py-2 text-left font-medium text-[#8E8E93] border border-[#E5E5EA]">Employee</th>
                          {days.map(day => (
                            <th key={day} className="px-1 py-2 text-center font-medium text-[#8E8E93] border border-[#E5E5EA]">
                              {day.substring(0, 3)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {employees.filter(emp => emp.is_active !== false).map((emp) => {
                          const employeeShifts = {};
                          days.forEach(day => {
                            const shift = roster.find(s => s.user_id === emp.id && s.day === day);
                            employeeShifts[day] = shift;
                          });

                          return (
                            <tr key={emp.id} className="hover:bg-[#F2F2F7]/50 transition-colors">
                              <td className="px-2 py-2 border border-[#E5E5EA]">
                                <div className="font-medium text-[#1C1C1E] text-xs">{emp.name}</div>
                                <div className="text-[10px] text-[#8E8E93]">{emp.job_title}</div>
                              </td>
                              {days.map(day => {
                                const shift = employeeShifts[day];
                                if (!shift) {
                                  return (
                                    <td key={`${emp.id}-${day}`} className="px-1 py-2 border border-[#E5E5EA] text-center">
                                      <span className="px-2 py-0.5 bg-[#F2F2F7] text-[#8E8E93] rounded-full text-[10px]">Off</span>
                                    </td>
                                  );
                                }
                                const colorClass = getBranchColor(shift.branch_name);
                                return (
                                  <td key={`${emp.id}-${day}`} className="px-1 py-2 border border-[#E5E5EA] text-center">
                                    <div className={`px-2 py-1 rounded-lg text-white text-[10px] ${colorClass}`}>
                                      <div className="font-semibold">{shift.branch_name}</div>
                                      <div className="opacity-80">{shift.start_time}-{shift.end_time}</div>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="bg-[#007AFF]/10 rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-[#007AFF]">{roster.length}</p>
                      <p className="text-xs text-[#8E8E93]">Total Shifts</p>
                    </div>
                    <div className="bg-[#34C759]/10 rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-[#34C759]">{new Set(roster.map(s => s.date)).size}</p>
                      <p className="text-xs text-[#8E8E93]">Days</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Employees Tab */}
        {activeTab === 'employees' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50 p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-semibold text-[#1C1C1E]">👥 Staff</h2>
              <button className="flex items-center gap-1 bg-[#007AFF] text-white px-3 py-1.5 rounded-xl hover:opacity-85 transition-all text-xs font-medium shadow-lg shadow-[#007AFF]/25">
                <UserPlusIcon className="h-4 w-4" />
                Add
              </button>
            </div>
            
            {employees.length === 0 ? (
              <p className="text-[#8E8E93] text-center py-6 text-sm">No employees found.</p>
            ) : (
              <div className="space-y-2">
                {employees.map((emp) => {
                  const hasException = exceptions.some(e => e.user_id === emp.id && e.is_active);
                  return (
                    <div key={emp.id} className="border border-[#E5E5EA] rounded-xl p-3 hover:bg-[#F2F2F7]/50 transition-all">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-[#1C1C1E] text-sm">{emp.name}</span>
                            <span className="text-xs text-[#8E8E93]">{emp.employee_id}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-[#3A3A3C]">{emp.job_title}</span>
                            <span className="text-[10px] text-[#C7C7CC]">·</span>
                            <span className="text-xs text-[#3A3A3C]">{emp.max_hours_per_week}h</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              emp.is_active ? 'bg-[#34C759]/12 text-[#34C759]' : 'bg-[#FF3B30]/12 text-[#FF3B30]'
                            }`}>
                              {emp.is_active ? 'Active' : 'Inactive'}
                            </span>
                            {hasException && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#AF52DE]/12 text-[#AF52DE]">
                                Exception
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setEditingEmployee(emp);
                            setShowEditModal(true);
                          }}
                          className="text-xs text-[#007AFF] font-medium hover:opacity-70 transition-opacity"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Exceptions Tab */}
        {activeTab === 'exceptions' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50 p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-semibold text-[#1C1C1E]">⚠️ Exceptions</h2>
              <button
                onClick={() => setShowExceptionModal(true)}
                className="flex items-center gap-1 bg-[#007AFF] text-white px-3 py-1.5 rounded-xl hover:opacity-85 transition-all text-xs font-medium shadow-lg shadow-[#007AFF]/25"
              >
                <PlusIcon className="h-4 w-4" />
                Add
              </button>
            </div>

            {exceptions.length === 0 ? (
              <p className="text-[#8E8E93] text-center py-6 text-sm">No exceptions found.</p>
            ) : (
              <div className="space-y-2">
                {exceptions.map((ex) => (
                  <div key={ex.id} className="border border-[#E5E5EA] rounded-xl p-3 hover:bg-[#F2F2F7]/50 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getExceptionBadge(ex.exception_type)}`}>
                            {ex.exception_type}
                          </span>
                          <span className="font-medium text-[#1C1C1E] text-sm">{ex.user_name}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-[#8E8E93] flex-wrap">
                          <span>Start: {ex.start_date}</span>
                          {ex.end_date && <span>End: {ex.end_date}</span>}
                          {ex.reduced_hours_per_week && (
                            <span className="bg-[#007AFF]/10 text-[#007AFF] px-2 py-0.5 rounded-full text-[10px] font-medium">
                              {ex.reduced_hours_per_week}h/week
                            </span>
                          )}
                        </div>
                        {ex.notes && <p className="text-xs text-[#8E8E93] mt-1">{ex.notes}</p>}
                      </div>
                      <button
                        onClick={async () => {
                          if (confirm('Deactivate this exception?')) {
                            const response = await fetch(`${API_BASE_URL}/api/admin/exceptions/${ex.id}`, {
                              method: 'DELETE'
                            });
                            if (response.ok) {
                              fetchExceptions();
                              fetchEmployees();
                            }
                          }
                        }}
                        className="text-[#FF3B30] hover:opacity-70 transition-opacity"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Swap Requests Tab */}
        {activeTab === 'swaps' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50 p-5">
            <h2 className="text-sm font-semibold text-[#1C1C1E] mb-4">🔄 Swap Requests</h2>
            
            {swapRequests.length === 0 ? (
              <p className="text-[#8E8E93] text-center py-6 text-sm">No pending swap requests.</p>
            ) : (
              <div className="space-y-2">
                {swapRequests.map((req) => (
                  <div key={req.id} className="border border-[#E5E5EA] rounded-xl p-3 hover:bg-[#F2F2F7]/50 transition-all">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-[#1C1C1E] text-sm">{req.requesting_user}</span>
                          <span className="text-[#C7C7CC] text-xs">→</span>
                          <span className="font-medium text-[#1C1C1E] text-sm">{req.target_user}</span>
                        </div>
                        <div className="text-xs text-[#8E8E93] mt-1">
                          <span>Shift: {req.assignment_date}</span>
                          {req.notes && <span className="ml-2">📝 {req.notes}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusBadge(req.status)}`}>
                          {req.status}
                        </span>
                        {req.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleSwapRequest(req.id, 'APPROVED')}
                              className="bg-[#34C759] text-white px-2 py-1 rounded-lg text-xs hover:opacity-80 transition-opacity"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => handleSwapRequest(req.id, 'REJECTED')}
                              className="bg-[#FF3B30] text-white px-2 py-1 rounded-lg text-xs hover:opacity-80 transition-opacity"
                            >
                              ✗
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Time Off Requests Tab */}
        {activeTab === 'timeoff' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50 p-5">
            <h2 className="text-sm font-semibold text-[#1C1C1E] mb-4">📅 Time Off Requests</h2>
            
            {timeOffRequests.length === 0 ? (
              <p className="text-[#8E8E93] text-center py-6 text-sm">No pending time off requests.</p>
            ) : (
              <div className="space-y-2">
                {timeOffRequests.map((req) => (
                  <div key={req.id} className="border border-[#E5E5EA] rounded-xl p-3 hover:bg-[#F2F2F7]/50 transition-all">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-[#1C1C1E] text-sm">{req.user_name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#007AFF]/10 text-[#007AFF]`}>
                            {req.reason}
                          </span>
                        </div>
                        <div className="text-xs text-[#8E8E93] mt-1">
                          <span>{req.start_date} → {req.end_date}</span>
                          {req.notes && <span className="ml-2">📝 {req.notes}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusBadge(req.status)}`}>
                          {req.status}
                        </span>
                        {req.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleTimeOffRequest(req.id, 'APPROVED')}
                              className="bg-[#34C759] text-white px-2 py-1 rounded-lg text-xs hover:opacity-80 transition-opacity"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => handleTimeOffRequest(req.id, 'REJECTED')}
                              className="bg-[#FF3B30] text-white px-2 py-1 rounded-lg text-xs hover:opacity-80 transition-opacity"
                            >
                              ✗
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-[#E5E5EA] z-10">
        <div className="flex justify-around items-center max-w-7xl mx-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all relative min-w-[56px] ${
                  isActive ? 'text-[#007AFF]' : 'text-[#8E8E93]'
                }`}
              >
                <div className="relative">
                  <Icon className={`h-5 w-5 ${isActive ? 'text-[#007AFF]' : 'text-[#8E8E93]'}`} />
                  {tab.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#FF3B30] text-white text-[9px] font-medium rounded-full px-1.5 py-0.5 min-w-[16px] text-center">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'text-[#007AFF]' : 'text-[#8E8E93]'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <div className="absolute -top-px left-1/2 transform -translate-x-1/2 w-5 h-0.5 bg-[#007AFF] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Exception Modal */}
      {showExceptionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[#1C1C1E]">Add Exception</h3>
              <button
                onClick={() => {
                  setShowExceptionModal(false);
                  resetExceptionForm();
                }}
                className="text-[#8E8E93] hover:text-[#1C1C1E] transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[#3A3A3C] mb-1">Employee</label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all"
                >
                  <option value="">Select Employee</option>
                  {employees.filter(e => e.is_active).map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3A3A3C] mb-1">Type</label>
                <select
                  value={exceptionType}
                  onChange={(e) => setExceptionType(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all"
                >
                  <option value="PREGNANCY">Pregnancy</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="LEAVE">Leave</option>
                  <option value="PART_TIME">Part Time</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3A3A3C] mb-1">Reduced Hours/Week</label>
                <input
                  type="number"
                  value={reducedHours}
                  onChange={(e) => setReducedHours(e.target.value)}
                  placeholder="e.g., 25"
                  className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#3A3A3C] mb-1">Start Date</label>
                  <input
                    type="date"
                    value={exceptionStartDate}
                    onChange={(e) => setExceptionStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#3A3A3C] mb-1">End Date</label>
                  <input
                    type="date"
                    value={exceptionEndDate}
                    onChange={(e) => setExceptionEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3A3A3C] mb-1">Notes</label>
                <textarea
                  value={exceptionNotes}
                  onChange={(e) => setExceptionNotes(e.target.value)}
                  placeholder="Additional details..."
                  className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all resize-none h-16"
                />
              </div>

              <button
                onClick={createException}
                className="w-full bg-[#007AFF] text-white py-3 rounded-xl hover:opacity-85 active:scale-[0.98] transition-all font-medium text-sm shadow-lg shadow-[#007AFF]/25"
              >
                Create Exception
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && editingEmployee && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[#1C1C1E]">Edit Employee</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingEmployee(null);
                }}
                className="text-[#8E8E93] hover:text-[#1C1C1E] transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[#3A3A3C] mb-1">Name</label>
                <input
                  type="text"
                  value={editingEmployee.name || ''}
                  onChange={(e) => setEditingEmployee({...editingEmployee, name: e.target.value})}
                  className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3A3A3C] mb-1">Email</label>
                <input
                  type="email"
                  value={editingEmployee.email || ''}
                  onChange={(e) => setEditingEmployee({...editingEmployee, email: e.target.value})}
                  className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3A3A3C] mb-1">Job Title</label>
                <input
                  type="text"
                  value={editingEmployee.job_title || ''}
                  onChange={(e) => setEditingEmployee({...editingEmployee, job_title: e.target.value})}
                  className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3A3A3C] mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editingEmployee.phone_number || ''}
                  onChange={(e) => setEditingEmployee({...editingEmployee, phone_number: e.target.value})}
                  className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3A3A3C] mb-1">Max Hours/Week</label>
                <input
                  type="number"
                  value={editingEmployee.max_hours_per_week || 45}
                  onChange={(e) => setEditingEmployee({...editingEmployee, max_hours_per_week: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all"
                />
              </div>

              <div className="flex items-center gap-3 py-1">
                <label className="text-sm font-medium text-[#3A3A3C]">Active</label>
                <input
                  type="checkbox"
                  checked={editingEmployee.is_active !== false}
                  onChange={(e) => setEditingEmployee({...editingEmployee, is_active: e.target.checked})}
                  className="w-4 h-4 text-[#007AFF] rounded focus:ring-[#007AFF]/30"
                />
              </div>

              <button
                onClick={updateEmployee}
                className="w-full bg-[#007AFF] text-white py-3 rounded-xl hover:opacity-85 active:scale-[0.98] transition-all font-medium text-sm shadow-lg shadow-[#007AFF]/25"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;