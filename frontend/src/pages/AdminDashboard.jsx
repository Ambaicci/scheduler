import { useState, useEffect, useMemo } from 'react';
import { 
  UserPlusIcon, CalendarIcon, ArrowRightOnRectangleIcon, ExclamationTriangleIcon,
  PlusIcon, XMarkIcon, ArrowsRightLeftIcon, CalendarDaysIcon, UsersIcon, SparklesIcon,
} from '@heroicons/react/24/solid';
import { API_BASE_URL } from '../config';
import ZingChat from '../components/ZingChat';
import ScheduleQuery from '../components/ScheduleQuery';
import OrganizationOnboarding from '../components/OrganizationOnboarding';

const AdminDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('roster');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [roster, setRoster] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [swapRequests, setSwapRequests] = useState([]);
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [generationDuration, setGenerationDuration] = useState('week');
  
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [exceptionType, setExceptionType] = useState('PREGNANCY');
  const [reducedHours, setReducedHours] = useState('');
  const [exceptionNotes, setExceptionNotes] = useState('');
  const [exceptionStartDate, setExceptionStartDate] = useState('');
  const [exceptionEndDate, setExceptionEndDate] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatContext, setChatContext] = useState('');
  const [chatActionId, setChatActionId] = useState(null);
  const [chatActionType, setChatActionType] = useState(null);

  const fetchEmployees = async () => { try { const res = await fetch(`${API_BASE_URL}/api/admin/employees`); setEmployees(await res.json()); } catch (err) { console.error(err); } };
  const fetchBranches = async () => { try { const res = await fetch(`${API_BASE_URL}/api/branches`); setBranches(await res.json()); } catch (err) { console.error(err); } };
  const fetchRoster = async () => { try { const res = await fetch(`${API_BASE_URL}/api/master-roster`); setRoster(await res.json()); } catch (err) { console.error(err); } };
  const fetchExceptions = async () => { try { const res = await fetch(`${API_BASE_URL}/api/admin/exceptions`); setExceptions(await res.json()); } catch (err) { console.error(err); } };
  const fetchSwapRequests = async () => { try { const res = await fetch(`${API_BASE_URL}/api/swap-requests`); setSwapRequests(await res.json()); } catch (err) { console.error(err); } };
  const fetchTimeOffRequests = async () => { try { const res = await fetch(`${API_BASE_URL}/api/time-off-requests`); setTimeOffRequests(await res.json()); } catch (err) { console.error(err); } };

  useEffect(() => { 
    fetchEmployees(); 
    fetchBranches(); 
    fetchRoster(); 
    fetchExceptions(); 
    fetchSwapRequests(); 
    fetchTimeOffRequests(); 
  }, []);

  const zingInsights = useMemo(() => {
    const insights = [];
    const pendingTimeOff = timeOffRequests.filter(r => r.status === 'PENDING');
    pendingTimeOff.forEach((req) => {
      insights.push({ id: `timeoff-${req.id}`, type: 'action', title: 'Time Off Request', message: `${req.user_name} requested ${req.start_date} off. Reason: ${req.reason}.`, action: 'Review', requestId: req.id, actionType: 'timeoff', context: `${req.user_name} requested time off on ${req.start_date} due to ${req.reason}. ${req.notes ? `They noted: "${req.notes}".` : ''} Would you like me to approve or reject this request?` });
    });
    const pendingSwaps = swapRequests.filter(r => r.status === 'PENDING');
    pendingSwaps.forEach((req) => {
      insights.push({ id: `swap-${req.id}`, type: 'action', title: 'Swap Request', message: `${req.requesting_user} wants to swap with ${req.target_user} on ${req.assignment_date}.`, action: 'Review', requestId: req.id, actionType: 'swap', context: `${req.requesting_user} wants to swap their shift on ${req.assignment_date} with ${req.target_user}. ${req.notes ? `Note: "${req.notes}".` : ''} Shall I approve this swap?` });
    });
    if (insights.length === 0) {
      insights.push({ id: 'all-clear', type: 'info', title: 'All Clear', message: 'No pending requests. Your schedule is optimized.', action: null, requestId: null, actionType: null, context: null });
    }
    return insights;
  }, [timeOffRequests, swapRequests]);

  const generateRoster = async () => {
    setLoading(true); setMessage('');
    try {
      const today = new Date();
      let startDate, endDate;

      if (generationDuration === 'day') {
        startDate = new Date(today); endDate = new Date(today);
      } else if (generationDuration === 'week') {
        const nextMonday = new Date(today); nextMonday.setDate(today.getDate() + (1 + 7 - today.getDay()) % 7);
        startDate = nextMonday; endDate = new Date(nextMonday); endDate.setDate(nextMonday.getDate() + 6);
      } else if (generationDuration === 'month') {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      } else if (generationDuration === 'quarter') {
        startDate = new Date(today); endDate = new Date(today); endDate.setMonth(today.getMonth() + 3);
      }

      const formatDate = (date) => date.toISOString().split('T')[0];
      const response = await fetch(`${API_BASE_URL}/api/smart-scheduler/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: "0c8cf570-ccce-416c-b8ec-0723aab90225", start_date: formatDate(startDate), end_date: formatDate(endDate), rotation_type: "none" })
      });
      const data = await response.json();
      if (data.status === 'success') setMessage(`🧠 AI optimized the schedule! ${data.assignments_created} shifts assigned.`);
      else setMessage(`AI Response: ${data.message}`);
      fetchRoster(); fetchEmployees();
    } catch (err) { setMessage('Error generating schedule.'); } finally { setLoading(false); }
  };

  const createException = async () => {
    if (!selectedEmployee) return alert('Please select an employee');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/exceptions?user_id=${selectedEmployee}&exception_type=${exceptionType}&start_date=${exceptionStartDate}&end_date=${exceptionEndDate}&reduced_hours_per_week=${reducedHours}&notes=${exceptionNotes}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMessage(`Success: ${data.message}`); fetchExceptions(); fetchEmployees(); setShowExceptionModal(false);
        setSelectedEmployee(''); setExceptionType('PREGNANCY'); setReducedHours(''); setExceptionNotes(''); setExceptionStartDate(''); setExceptionEndDate('');
      }
    } catch (err) { setMessage('Error creating exception'); }
  };

  const handleSwapRequest = async (requestId, status) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/swap-request/${requestId}?status=${status}`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) { setMessage(`Success: ${data.message}`); fetchSwapRequests(); fetchRoster(); }
    } catch (err) { setMessage('Error updating swap request'); }
  };

  const handleTimeOffRequest = async (requestId, status) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/time-off-request/${requestId}?status=${status}`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) { setMessage(`Success: ${data.message}`); fetchTimeOffRequests(); }
    } catch (err) { setMessage('Error updating time off request'); }
  };

  const updateEmployee = async () => {
    if (!editingEmployee) return;
    try {
      const params = new URLSearchParams();
      Object.keys(editingEmployee).forEach(key => { if (editingEmployee[key] !== undefined && editingEmployee[key] !== null && key !== 'id') params.append(key, editingEmployee[key]); });
      const res = await fetch(`${API_BASE_URL}/api/admin/employees/${editingEmployee.id}?${params.toString()}`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) { setMessage(`Success: ${data.message}`); fetchEmployees(); setShowEditModal(false); setEditingEmployee(null); }
    } catch (err) { setMessage('Error updating employee'); }
  };

  const getStatusBadge = (status) => {
    const colors = { 'PENDING': 'bg-z-orange/10 text-z-orange', 'APPROVED': 'bg-z-green/10 text-z-green', 'REJECTED': 'bg-z-red/10 text-z-red' };
    return colors[status] || 'bg-z-text-dim/10 text-z-text-dim';
  };

  const tabs = [
    { id: 'roster', label: 'Schedule', icon: CalendarIcon },
    { id: 'employees', label: 'Team', icon: UsersIcon },
    { id: 'exceptions', label: 'Exceptions', icon: ExclamationTriangleIcon, badge: exceptions.length },
    { id: 'swaps', label: 'Swaps', icon: ArrowsRightLeftIcon, badge: swapRequests.filter(r => r.status === 'PENDING').length },
    { id: 'timeoff', label: 'Time Off', icon: CalendarDaysIcon, badge: timeOffRequests.filter(r => r.status === 'PENDING').length },
  ];

  return (
    <div className="min-h-screen bg-z-page font-body text-z-text pb-20 md:pb-0">
      {/* ONBOARDING WIZARD OVERLAY */}
      {showOnboarding && <OrganizationOnboarding onComplete={() => setShowOnboarding(false)} />}

      {/* Top Navigation */}
      <nav className="sticky top-0 z-30 bg-z-bg/80 backdrop-blur-xl border-b border-z-border">
        <div className="px-4 py-3 max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-z-purple rounded-lg flex items-center justify-center shadow-[0_0_12px_rgba(191,90,242,0.4)]">
              <SparklesIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-display font-bold text-z-text tracking-tight">ZING</h1>
              <p className="text-[10px] text-z-text-dim font-mono font-semibold uppercase tracking-wider">Command Center</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowOnboarding(true)} className="text-sm font-semibold text-z-blue hover:text-z-purple transition-colors">
              Setup Organization
            </button>
            <button onClick={onLogout} className="text-sm text-z-text-dim hover:text-z-red transition-colors font-medium">Sign Out</button>
          </div>
        </div>
        {/* Desktop Tabs */}
        <div className="hidden md:flex px-4 max-w-7xl mx-auto gap-1 border-t border-z-border/50">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${isActive ? 'border-z-purple text-z-purple' : 'border-transparent text-z-text-dim hover:text-z-text'}`}>
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.badge > 0 && <span className="bg-z-red text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">{tab.badge}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="px-4 py-6 max-w-7xl mx-auto space-y-6">
        {/* Live AI Insights */}
        <div className="bg-z-surface rounded-2xl border border-z-border overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-z-border bg-z-surface-hi/50 flex items-center gap-3">
            <div className="w-8 h-8 bg-z-purple/20 rounded-lg flex items-center justify-center">
              <SparklesIcon className="w-4 h-4 text-z-purple" />
            </div>
            <div>
              <h3 className="text-sm font-display font-bold text-z-text">Zing AI Briefing</h3>
              <p className="text-xs text-z-text-dim font-mono">{zingInsights.filter(i => i.action).length} items need your attention</p>
            </div>
          </div>
          <div className="divide-y divide-z-border">
            {zingInsights.map((insight) => (
              <div key={insight.id} className="px-5 py-4 flex items-center justify-between hover:bg-z-surface-hi/50 transition-colors cursor-pointer group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${insight.type === 'warning' ? 'bg-z-orange' : insight.type === 'info' ? 'bg-z-green' : 'bg-z-purple'}`}></span>
                    <span className="text-sm font-semibold text-z-text">{insight.title}</span>
                  </div>
                  <p className="text-xs text-z-text-dim truncate">{insight.message}</p>
                </div>
                {insight.action && (
                  <button onClick={() => { setChatContext(insight.context); setChatActionId(insight.requestId); setChatActionType(insight.actionType); setIsChatOpen(true); }} className="ml-4 text-xs font-mono font-semibold text-z-blue group-hover:text-z-purple transition-colors whitespace-nowrap">
                    {insight.action} →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-xl text-sm font-medium ${message.includes('Success') || message.includes('AI optimized') ? 'bg-z-green/10 text-z-green border border-z-green/20' : 'bg-z-orange/10 text-z-orange border border-z-orange/20'}`}>
            {message}
          </div>
        )}

        {/* Roster Tab */}
        {activeTab === 'roster' && (
          <div className="space-y-6">
            <div className="bg-z-surface rounded-2xl border border-z-border p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-display font-bold text-z-text">Generate Schedule</h2>
                  <p className="text-sm text-z-text-dim mt-1 font-mono">AI will optimize shifts based on availability.</p>
                </div>
                <div className="flex items-center gap-2 bg-z-page/50 border border-z-border rounded-xl p-1">
                  {['day', 'week', 'month', 'quarter'].map((duration) => (
                    <button key={duration} onClick={() => setGenerationDuration(duration)} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${generationDuration === duration ? 'bg-z-purple text-white shadow-sm' : 'text-z-text-dim hover:text-z-text'}`}>
                      {duration.charAt(0).toUpperCase() + duration.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={generateRoster} disabled={loading} className="w-full md:w-auto bg-z-blue text-white px-6 py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                <SparklesIcon className="w-4 h-4" />
                {loading ? 'Optimizing...' : `Generate ${generationDuration.charAt(0).toUpperCase() + generationDuration.slice(1)} Schedule`}
              </button>
            </div>
            <ScheduleQuery roster={roster} employees={employees} branches={branches} />
          </div>
        )}

        {/* Employees Tab */}
        {activeTab === 'employees' && (
          <div className="bg-z-surface rounded-2xl border border-z-border p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div><h2 className="text-lg font-display font-bold text-z-text">Team Members</h2><p className="text-sm text-z-text-dim font-mono">Manage your workforce</p></div>
              <button className="flex items-center gap-2 bg-z-blue text-white px-4 py-2 rounded-lg hover:opacity-90 active:scale-95 transition-all text-sm font-semibold"><UserPlusIcon className="h-4 w-4" /> Add Staff</button>
            </div>
            {employees.length === 0 ? <p className="text-z-text-dim text-center py-12 text-sm font-mono">No team members found.</p> : (
              <div className="space-y-3">
                {employees.map((emp) => (
                  <div key={emp.id} className="bg-z-page/50 rounded-xl p-4 flex justify-between items-center border border-z-border/50 hover:border-z-border transition-colors">
                    <div>
                      <div className="flex items-center gap-2"><span className="font-semibold text-z-text text-sm">{emp.name}</span><span className="text-xs text-z-text-faint font-mono">{emp.employee_id}</span></div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-z-text-dim font-mono">{emp.job_title} · {emp.max_hours_per_week}h/week</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${emp.is_active ? 'bg-z-green/10 text-z-green' : 'bg-z-red/10 text-z-red'}`}>{emp.is_active ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                    <button onClick={() => { setEditingEmployee(emp); setShowEditModal(true); }} className="text-xs text-z-blue font-semibold hover:opacity-70 transition-opacity px-3 py-1.5 bg-z-blue/10 rounded-lg">Edit</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Exceptions Tab */}
        {activeTab === 'exceptions' && (
          <div className="bg-z-surface rounded-2xl border border-z-border p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div><h2 className="text-lg font-display font-bold text-z-text">Exceptions</h2><p className="text-sm text-z-text-dim font-mono">Manage special circumstances</p></div>
              <button onClick={() => setShowExceptionModal(true)} className="flex items-center gap-2 bg-z-blue text-white px-4 py-2 rounded-lg hover:opacity-90 active:scale-95 transition-all text-sm font-semibold"><PlusIcon className="h-4 w-4" /> Add</button>
            </div>
            {exceptions.length === 0 ? <p className="text-z-text-dim text-center py-12 text-sm font-mono">No exceptions found.</p> : (
              <div className="space-y-3">
                {exceptions.map((ex) => (
                  <div key={ex.id} className="bg-z-page/50 rounded-xl p-4 flex justify-between items-start border border-z-border/50">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-z-purple/10 text-z-purple">{ex.exception_type}</span>
                        <span className="font-semibold text-z-text text-sm">{ex.user_name}</span>
                      </div>
                      <div className="text-xs text-z-text-dim font-mono">Start: {ex.start_date} {ex.end_date && `· End: ${ex.end_date}`}</div>
                    </div>
                    <button onClick={async () => { if (confirm('Deactivate?')) { await fetch(`${API_BASE_URL}/api/admin/exceptions/${ex.id}`, { method: 'DELETE' }); fetchExceptions(); fetchEmployees(); } }} className="text-z-red hover:opacity-70 transition-opacity p-1 bg-z-red/10 rounded-lg"><XMarkIcon className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Swaps Tab */}
        {activeTab === 'swaps' && (
          <div className="bg-z-surface rounded-2xl border border-z-border p-6 shadow-sm">
            <h2 className="text-lg font-display font-bold text-z-text mb-1">Swap Requests</h2>
            <p className="text-sm text-z-text-dim font-mono mb-6">Review and approve shift swaps</p>
            {swapRequests.length === 0 ? <p className="text-z-text-dim text-center py-12 text-sm font-mono">No swap requests.</p> : (
              <div className="space-y-3">
                {swapRequests.map((req) => (
                  <div key={req.id} className="bg-z-page/50 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border border-z-border/50">
                    <div>
                      <div className="flex items-center gap-2"><span className="font-semibold text-z-text text-sm">{req.requesting_user}</span><ArrowsRightLeftIcon className="w-3 h-3 text-z-text-faint" /><span className="font-semibold text-z-text text-sm">{req.target_user}</span></div>
                      <div className="text-xs text-z-text-dim font-mono mt-1">Shift: {req.assignment_date}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${getStatusBadge(req.status)}`}>{req.status}</span>
                      {req.ai_verified && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-z-purple/10 text-z-purple border border-z-purple/20 flex items-center gap-1 ml-2">🛡️ AI-Verified</span>
                      )}
                      {req.status === 'PENDING' && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleSwapRequest(req.id, 'APPROVED')} className="bg-z-green text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 active:scale-95 transition-all">Approve</button>
                          <button onClick={() => handleSwapRequest(req.id, 'REJECTED')} className="bg-z-red text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 active:scale-95 transition-all">Reject</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Time Off Tab */}
        {activeTab === 'timeoff' && (
          <div className="bg-z-surface rounded-2xl border border-z-border p-6 shadow-sm">
            <h2 className="text-lg font-display font-bold text-z-text mb-1">Time Off Requests</h2>
            <p className="text-sm text-z-text-dim font-mono mb-6">Manage leave and time off</p>
            {timeOffRequests.length === 0 ? <p className="text-z-text-dim text-center py-12 text-sm font-mono">No time off requests.</p> : (
              <div className="space-y-3">
                {timeOffRequests.map((req) => (
                  <div key={req.id} className="bg-z-page/50 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border border-z-border/50">
                    <div>
                      <div className="flex items-center gap-2"><span className="font-semibold text-z-text text-sm">{req.user_name}</span><span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-z-blue/10 text-z-blue">{req.reason}</span></div>
                      <div className="text-xs text-z-text-dim font-mono mt-1">{req.start_date} → {req.end_date}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${getStatusBadge(req.status)}`}>{req.status}</span>
                      {req.status === 'PENDING' && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleTimeOffRequest(req.id, 'APPROVED')} className="bg-z-green text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 active:scale-95 transition-all">Approve</button>
                          <button onClick={() => handleTimeOffRequest(req.id, 'REJECTED')} className="bg-z-red text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-90 active:scale-95 transition-all">Reject</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-z-bg/90 backdrop-blur-xl border-t border-z-border z-20">
        <div className="flex justify-around items-center max-w-7xl mx-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center py-3 px-2 rounded-xl transition-all relative min-w-[60px] ${isActive ? 'text-z-purple' : 'text-z-text-dim'}`}>
                <div className="relative">
                  <Icon className={`h-6 w-6 ${isActive ? 'text-z-purple' : 'text-z-text-dim'}`} />
                  {tab.badge > 0 && <span className="absolute -top-1.5 -right-2 bg-z-red text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">{tab.badge}</span>}
                </div>
                <span className={`text-[10px] font-semibold mt-1 font-mono ${isActive ? 'text-z-purple' : 'text-z-text-dim'}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Floating AI Button */}
      <button onClick={() => { setChatContext(''); setChatActionId(null); setChatActionType(null); setIsChatOpen(true); }} className="fixed bottom-24 right-6 z-20 bg-z-purple text-white p-4 rounded-full hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-[0_8px_24px_rgba(191,90,242,0.4)]">
        <SparklesIcon className="w-6 h-6" />
      </button>

      {/* Modals */}
      {showExceptionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-z-bg rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl border border-z-border">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-display font-bold text-z-text">Add Exception</h3>
              <button onClick={() => setShowExceptionModal(false)} className="text-z-text-dim hover:text-z-text transition-colors bg-z-surface p-1 rounded-full"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-z-text mb-1.5 font-mono">Employee</label>
                <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:ring-2 focus:ring-z-purple/30 focus:border-z-purple transition-all">
                  <option value="">Select Employee</option>
                  {employees.filter(e => e.is_active).map((emp) => (<option key={emp.id} value={emp.id}>{emp.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-z-text mb-1.5 font-mono">Type</label>
                <select value={exceptionType} onChange={(e) => setExceptionType(e.target.value)} className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:ring-2 focus:ring-z-purple/30 focus:border-z-purple transition-all">
                  <option value="PREGNANCY">Pregnancy</option><option value="SICK">Sick Leave</option><option value="LEAVE">Leave</option><option value="PART_TIME">Part Time</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-z-text mb-1.5 font-mono">Reduced Hours/Week</label>
                <input type="number" value={reducedHours} onChange={(e) => setReducedHours(e.target.value)} placeholder="e.g., 25" className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text placeholder-z-text-faint focus:outline-none focus:ring-2 focus:ring-z-purple/30 focus:border-z-purple transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-semibold text-z-text mb-1.5 font-mono">Start Date</label><input type="date" value={exceptionStartDate} onChange={(e) => setExceptionStartDate(e.target.value)} className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:ring-2 focus:ring-z-purple/30 focus:border-z-purple transition-all" /></div>
                <div><label className="block text-sm font-semibold text-z-text mb-1.5 font-mono">End Date</label><input type="date" value={exceptionEndDate} onChange={(e) => setExceptionEndDate(e.target.value)} className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:ring-2 focus:ring-z-purple/30 focus:border-z-purple transition-all" /></div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-z-text mb-1.5 font-mono">Notes</label>
                <textarea value={exceptionNotes} onChange={(e) => setExceptionNotes(e.target.value)} placeholder="Additional details..." className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text placeholder-z-text-faint focus:outline-none focus:ring-2 focus:ring-z-purple/30 focus:border-z-purple transition-all resize-none h-20" />
              </div>
              <button onClick={createException} className="w-full bg-z-blue text-white py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all font-semibold text-sm">Create Exception</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingEmployee && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-z-bg rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl border border-z-border">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-display font-bold text-z-text">Edit Team Member</h3>
              <button onClick={() => { setShowEditModal(false); setEditingEmployee(null); }} className="text-z-text-dim hover:text-z-text transition-colors bg-z-surface p-1 rounded-full"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-semibold text-z-text mb-1.5 font-mono">Name</label><input type="text" value={editingEmployee.name || ''} onChange={(e) => setEditingEmployee({...editingEmployee, name: e.target.value})} className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:ring-2 focus:ring-z-purple/30 focus:border-z-purple transition-all" /></div>
              <div><label className="block text-sm font-semibold text-z-text mb-1.5 font-mono">Email</label><input type="email" value={editingEmployee.email || ''} onChange={(e) => setEditingEmployee({...editingEmployee, email: e.target.value})} className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:ring-2 focus:ring-z-purple/30 focus:border-z-purple transition-all" /></div>
              <div><label className="block text-sm font-semibold text-z-text mb-1.5 font-mono">Job Title</label><input type="text" value={editingEmployee.job_title || ''} onChange={(e) => setEditingEmployee({...editingEmployee, job_title: e.target.value})} className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:ring-2 focus:ring-z-purple/30 focus:border-z-purple transition-all" /></div>
              <div><label className="block text-sm font-semibold text-z-text mb-1.5 font-mono">Phone Number</label><input type="text" value={editingEmployee.phone_number || ''} onChange={(e) => setEditingEmployee({...editingEmployee, phone_number: e.target.value})} className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:ring-2 focus:ring-z-purple/30 focus:border-z-purple transition-all" /></div>
              <div><label className="block text-sm font-semibold text-z-text mb-1.5 font-mono">Max Hours/Week</label><input type="number" value={editingEmployee.max_hours_per_week || 45} onChange={(e) => setEditingEmployee({...editingEmployee, max_hours_per_week: parseFloat(e.target.value)})} className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:ring-2 focus:ring-z-purple/30 focus:border-z-purple transition-all" /></div>
              <div className="flex items-center gap-3 py-1"><label className="text-sm font-semibold text-z-text font-mono">Active Status</label><input type="checkbox" checked={editingEmployee.is_active !== false} onChange={(e) => setEditingEmployee({...editingEmployee, is_active: e.target.checked})} className="w-5 h-5 text-z-purple rounded focus:ring-z-purple/30 bg-z-surface border-z-border" /></div>
              <button onClick={updateEmployee} className="w-full bg-z-blue text-white py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all font-semibold text-sm">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      <ZingChat isOpen={isChatOpen} onClose={() => { setIsChatOpen(false); setChatContext(''); setChatActionId(null); setChatActionType(null); }} initialContext={chatContext} actionId={chatActionId} actionType={chatActionType} onActionComplete={() => { fetchTimeOffRequests(); fetchSwapRequests(); }} />
    </div>
  );
};

export default AdminDashboard;