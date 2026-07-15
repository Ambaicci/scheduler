import { useState, useEffect } from 'react';
import { 
  CalendarIcon, ClockIcon, MapPinIcon, ArrowRightOnRectangleIcon,
  XMarkIcon, ArrowPathIcon, CalendarDaysIcon, ArrowsRightLeftIcon,
  CheckCircleIcon, XCircleIcon, ClockIcon as ClockPendingIcon, SparklesIcon
} from '@heroicons/react/24/solid';
import { API_BASE_URL } from '../config';
import Toast from '../components/Toast';

const EmployeeDashboard = ({ user, onLogout }) => {
  const [schedule, setSchedule] = useState([]);
  const [myRequests, setMyRequests] = useState({ time_off: [], swaps: [] });
  const [incomingSwaps, setIncomingSwaps] = useState([]);
  const [checkingSwapId, setCheckingSwapId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [requestType, setRequestType] = useState(''); 
  const [toast, setToast] = useState(null);
  
  const [timeOffForm, setTimeOffForm] = useState({ reason: '', notes: '' });
  const [swapForm, setSwapForm] = useState({ targetEmployee: '', notes: '' });
  const [colleagues, setColleagues] = useState([]);

  useEffect(() => {
    fetchSchedule();
    fetchColleagues();
    fetchMyRequests();
    fetchIncomingSwaps();
  }, []);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/my-schedule/${user.user_id}`);
      if (response.ok) {
        const data = await response.json();
        const sorted = data.sort((a, b) => new Date(a.date) - new Date(b.date));
        setSchedule(sorted);
      }
    } catch (err) { console.error('Failed to fetch schedule:', err); } 
    finally { setLoading(false); }
  };

  const fetchColleagues = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/employees`);
      const data = await res.json();
      const activeColleagues = data.filter(emp => emp.id !== user.user_id && emp.is_active);
      setColleagues(activeColleagues);
    } catch (err) { console.error('Failed to fetch colleagues:', err); }
  };

  const fetchMyRequests = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/my-requests/${user.user_id}`);
      if (res.ok) {
        const data = await res.json();
        setMyRequests(data);
      }
    } catch (err) { console.error('Failed to fetch requests:', err); }
  };

  const fetchIncomingSwaps = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/swap-requests`);
      const data = await res.json();
      const incoming = data.filter(req => req.target_user_id === user.user_id && req.status === 'PENDING');
      setIncomingSwaps(incoming);
    } catch (err) { console.error('Failed to fetch incoming swaps:', err); }
  };

  const handleAcceptSwap = async (swap) => {
    setCheckingSwapId(swap.id);
    try {
      const aiRes = await fetch(`${API_BASE_URL}/api/ai-check-swap?user_a_id=${swap.requesting_user_id}&user_b_id=${user.user_id}&assignment_id=${swap.assignment_id}`);
      const aiData = await aiRes.json();
      
      if (aiData.verdict === 'CLEAR') {

        const dbRes = await fetch(`${API_BASE_URL}/api/swap-request/${swap.id}?status=APPROVED&ai_verified=true`, { method: 'PUT' });
         if (dbRes.ok) {
          setToast({ message: `Swap Approved! Zing verified: ${aiData.reason}`, type: 'success' });
          fetchIncomingSwaps();
          fetchMyRequests();
        } else {
          setToast({ message: 'Failed to update swap status in database.', type: 'error' });
        }
      } else {
        setToast({ message: `Swap Blocked by Zing. Reason: ${aiData.reason}`, type: 'error' });
      }
    } catch (err) { 
      console.error(err); 
      setToast({ message: 'Error connecting to AI compliance checker.', type: 'error' }); 
    } finally { 
      setCheckingSwapId(null); 
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const getDayName = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });

  const submitTimeOffRequest = async () => {
    if (!timeOffForm.reason) {
      setToast({ message: 'Please select a reason.', type: 'error' });
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/time-off-request?user_id=${user.user_id}&start_date=${selectedShift.date}&end_date=${selectedShift.date}&reason=${encodeURIComponent(timeOffForm.reason)}&notes=${encodeURIComponent(timeOffForm.notes)}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setToast({ message: 'Time off request submitted successfully!', type: 'success' });
        setShowRequestModal(false); setRequestType(''); setTimeOffForm({ reason: '', notes: '' });
        fetchMyRequests();
      } else { setToast({ message: 'Failed to submit request.', type: 'error' }); }
    } catch (err) { 
      console.error(err); 
      setToast({ message: 'Error submitting request.', type: 'error' }); 
    }
  };

  const submitSwapRequest = async () => {
    if (!swapForm.targetEmployee) {
      setToast({ message: 'Please select a colleague to swap with.', type: 'error' });
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/swap-request?requesting_user_id=${user.user_id}&target_user_id=${swapForm.targetEmployee}&assignment_id=${selectedShift.assignment_id}&notes=${encodeURIComponent(swapForm.notes)}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setToast({ message: 'Swap request sent to colleague!', type: 'success' });
        setShowRequestModal(false); setRequestType(''); setSwapForm({ targetEmployee: '', notes: '' });
        fetchMyRequests();
      } else { setToast({ message: 'Failed to submit swap request.', type: 'error' }); }
    } catch (err) { 
      console.error(err); 
      setToast({ message: 'Error submitting swap request.', type: 'error' }); 
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'APPROVED') return 'bg-z-green/10 text-z-green border border-z-green/20 flex items-center gap-1';
    if (status === 'REJECTED') return 'bg-z-red/10 text-z-red border border-z-red/20 flex items-center gap-1';
    return 'bg-z-orange/10 text-z-orange border border-z-orange/20 flex items-center gap-1';
  };

  const getStatusIcon = (status) => {
    if (status === 'APPROVED') return <CheckCircleIcon className="w-3 h-3" />;
    if (status === 'REJECTED') return <XCircleIcon className="w-3 h-3" />;
    return <ClockPendingIcon className="w-3 h-3" />;
  };

  return (
    <div className="min-h-screen bg-z-page font-body text-z-text pb-24">
      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <nav className="bg-z-bg/80 backdrop-blur-xl border-b border-z-border sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-z-purple rounded-xl flex items-center justify-center shadow-[0_0_12px_rgba(191,90,242,0.4)]">
                <SparklesIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-display font-bold text-z-text tracking-tight">ZING</h1>
                <p className="text-[10px] text-z-text-dim font-mono font-semibold uppercase tracking-wider">My Schedule</p>
              </div>
            </div>
            <button onClick={onLogout} className="text-z-text-dim hover:text-z-red transition-colors p-2" title="Sign Out">
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="px-4 py-6 max-w-3xl mx-auto space-y-8">
        <div>
          <h2 className="font-display font-semibold text-3xl text-z-text tracking-tight">{getGreeting()}, {user?.name?.split(' ')[0] || 'Team Member'}.</h2>
          <p className="text-z-text-dim mt-2 text-sm font-mono">Here is your upcoming schedule and request status.</p>
        </div>

        {incomingSwaps.length > 0 && (
          <div className="bg-z-surface rounded-2xl border border-z-purple/30 overflow-hidden shadow-[0_0_20px_rgba(191,90,242,0.1)]">
            <div className="px-5 py-4 border-b border-z-border bg-z-purple/10 flex items-center gap-3">
              <ArrowsRightLeftIcon className="w-5 h-5 text-z-purple" />
              <div>
                <h3 className="text-sm font-display font-bold text-z-text">Incoming Swap Requests</h3>
                <p className="text-xs text-z-text-dim font-mono">Zing will auto-check compliance when you accept.</p>
              </div>
            </div>
            <div className="divide-y divide-z-border">
              {incomingSwaps.map(swap => (
                <div key={swap.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-z-surface-hi/30 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-z-text">
                      <span className="text-z-blue">{swap.requesting_user}</span> wants to swap with you.
                    </p>
                    <p className="text-xs text-z-text-dim font-mono mt-1">Shift: {swap.assignment_date} {swap.notes && `• "${swap.notes}"`}</p>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button 
                      onClick={() => handleAcceptSwap(swap)}
                      disabled={checkingSwapId === swap.id}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-z-green text-white text-xs font-bold font-mono hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {checkingSwapId === swap.id ? (
                        <>
                          <ArrowPathIcon className="w-3 h-3 animate-spin" /> Zing Checking...
                        </>
                      ) : (
                        <>Accept Swap</>
                      )}
                    </button>
                    <button className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-z-border text-z-text-dim text-xs font-bold font-mono hover:bg-z-red/10 hover:text-z-red hover:border-z-red/30 transition-all">
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(myRequests.time_off?.length > 0 || myRequests.swaps?.length > 0) && (
          <div className="bg-z-surface rounded-2xl border border-z-border overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-z-border bg-z-surface-hi/50 flex items-center gap-3">
              <ClockPendingIcon className="w-5 h-5 text-z-purple" />
              <div>
                <h3 className="text-sm font-display font-bold text-z-text">My Requests</h3>
                <p className="text-xs text-z-text-dim font-mono">Track your time off and swap statuses</p>
              </div>
            </div>
            <div className="divide-y divide-z-border max-h-64 overflow-y-auto no-scrollbar">
              {myRequests.time_off?.map(req => (
                <div key={`to-${req.id}`} className="px-5 py-3.5 flex items-center justify-between hover:bg-z-surface-hi/30 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-z-text">Time Off: {req.start_date}</p>
                    <p className="text-xs text-z-text-dim font-mono mt-0.5">{req.reason} {req.notes && `• ${req.notes}`}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-wide ${getStatusBadge(req.status)}`}>
                    {getStatusIcon(req.status)} {req.status}
                  </span>
                </div>
              ))}
              {myRequests.swaps?.map(req => (
                <div key={`sw-${req.id}`} className="px-5 py-3.5 flex items-center justify-between hover:bg-z-surface-hi/30 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-z-text">Swap Request: {req.assignment_date || req.date}</p>
                    <p className="text-xs text-z-text-dim font-mono mt-0.5">With: {req.target_user || 'Colleague'}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-wide ${getStatusBadge(req.status)}`}>
                    {getStatusIcon(req.status)} {req.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <ArrowPathIcon className="w-8 h-8 text-z-purple animate-spin mb-3" />
            <p className="text-z-text-dim text-sm font-mono">Loading your week...</p>
          </div>
        ) : schedule.length === 0 ? (
          <div className="bg-z-surface rounded-2xl border border-z-border p-12 text-center shadow-sm">
            <CalendarIcon className="w-16 h-16 text-z-text-dim mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-display font-semibold text-z-text mb-1">No shifts scheduled</h3>
            <p className="text-sm text-z-text-dim font-mono">You have no upcoming shifts. Enjoy your time off!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="font-mono text-[10.5px] text-z-text-faint uppercase tracking-widest mb-1">Upcoming Shifts</div>
            {schedule.map((shift, index) => (
              <div key={index} className="bg-z-surface rounded-2xl border border-z-border shadow-sm overflow-hidden hover:border-z-border/80 transition-all">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs font-mono font-bold text-z-purple uppercase tracking-wider">{getDayName(shift.date)}</p>
                      <h3 className="text-lg font-display font-bold text-z-text mt-0.5">{formatDate(shift.date)}</h3>
                    </div>
                    <div className="bg-z-green/10 text-z-green border border-z-green/20 px-3 py-1 rounded-full text-xs font-mono font-bold">Confirmed</div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-z-text-dim mb-5">
                    <div className="flex items-center gap-2">
                      <ClockIcon className="w-4 h-4 text-z-text-faint" />
                      <span className="font-semibold text-z-text font-mono">{shift.start_time?.substring(0, 5)} - {shift.end_time?.substring(0, 5)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="w-4 h-4 text-z-text-faint" />
                      <span className="font-semibold text-z-text">{shift.branch}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setSelectedShift(shift); setShowRequestModal(true); setRequestType(''); }}
                    className="w-full py-3 rounded-xl border border-z-border text-z-blue text-sm font-semibold hover:bg-z-surface-hi hover:border-z-purple/50 transition-all active:scale-[0.98]"
                  >
                    Request Change
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showRequestModal && selectedShift && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-z-bg w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-z-border shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out]">
            <div className="px-6 py-4 border-b border-z-border flex justify-between items-center bg-z-surface-hi/50">
              <h3 className="text-base font-display font-bold text-z-text">Request Change</h3>
              <button onClick={() => setShowRequestModal(false)} className="text-z-text-dim hover:text-z-text transition-colors p-1 bg-z-surface rounded-full border border-z-border">
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-z-page/50 rounded-xl p-3 border border-z-border/50 mb-4">
                <p className="text-xs text-z-text-faint font-mono uppercase">Selected Shift</p>
                <p className="text-sm font-semibold text-z-text mt-1">{formatDate(selectedShift.date)} · {selectedShift.branch}</p>
                <p className="text-xs text-z-text-dim font-mono">{selectedShift.start_time?.substring(0, 5)} - {selectedShift.end_time?.substring(0, 5)}</p>
              </div>

              {!requestType ? (
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setRequestType('timeoff')} className="p-4 bg-z-surface border border-z-border rounded-xl hover:border-z-purple/50 hover:bg-z-surface-hi transition-all text-center group">
                    <CalendarDaysIcon className="w-6 h-6 text-z-orange mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-semibold text-z-text block">Time Off</span>
                    <span className="text-[10px] text-z-text-dim font-mono mt-1 block">Request leave</span>
                  </button>
                  <button onClick={() => setRequestType('swap')} className="p-4 bg-z-surface border border-z-border rounded-xl hover:border-z-purple/50 hover:bg-z-surface-hi transition-all text-center group">
                    <ArrowsRightLeftIcon className="w-6 h-6 text-z-blue mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-semibold text-z-text block">Swap Shift</span>
                    <span className="text-[10px] text-z-text-dim font-mono mt-1 block">Trade with colleague</span>
                  </button>
                </div>
              ) : requestType === 'timeoff' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono font-semibold text-z-text-faint uppercase tracking-wider mb-1.5">Reason</label>
                    <select value={timeOffForm.reason} onChange={(e) => setTimeOffForm({...timeOffForm, reason: e.target.value})} className="w-full px-4 py-2.5 bg-z-page/50 border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:border-z-purple focus:ring-1 focus:ring-z-purple/30 transition-all">
                      <option value="">Select a reason...</option>
                      <option value="Sick Leave">Sick Leave</option>
                      <option value="Personal">Personal</option>
                      <option value="Family Emergency">Family Emergency</option>
                      <option value="Vacation">Vacation</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-semibold text-z-text-faint uppercase tracking-wider mb-1.5">Notes (Optional)</label>
                    <textarea value={timeOffForm.notes} onChange={(e) => setTimeOffForm({...timeOffForm, notes: e.target.value})} placeholder="Any additional details..." className="w-full px-4 py-2.5 bg-z-page/50 border border-z-border rounded-xl text-sm text-z-text placeholder-z-text-faint focus:outline-none focus:border-z-purple focus:ring-1 focus:ring-z-purple/30 transition-all resize-none h-20" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setRequestType('')} className="flex-1 py-2.5 rounded-xl border border-z-border text-z-text-dim text-sm font-semibold hover:bg-z-surface transition-all">Back</button>
                    <button onClick={submitTimeOffRequest} className="flex-1 py-2.5 rounded-xl bg-z-blue text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all">Submit Request</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono font-semibold text-z-text-faint uppercase tracking-wider mb-1.5">Colleague to Swap With</label>
                    <select value={swapForm.targetEmployee} onChange={(e) => setSwapForm({...swapForm, targetEmployee: e.target.value})} className="w-full px-4 py-2.5 bg-z-page/50 border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:border-z-purple focus:ring-1 focus:ring-z-purple/30 transition-all">
                      <option value="">Select a colleague...</option>
                      {colleagues.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.job_title})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-semibold text-z-text-faint uppercase tracking-wider mb-1.5">Notes (Optional)</label>
                    <textarea value={swapForm.notes} onChange={(e) => setSwapForm({...swapForm, notes: e.target.value})} placeholder="e.g., Can you cover my Thursday shift?" className="w-full px-4 py-2.5 bg-z-page/50 border border-z-border rounded-xl text-sm text-z-text placeholder-z-text-faint focus:outline-none focus:border-z-purple focus:ring-1 focus:ring-z-purple/30 transition-all resize-none h-20" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setRequestType('')} className="flex-1 py-2.5 rounded-xl border border-z-border text-z-text-dim text-sm font-semibold hover:bg-z-surface transition-all">Back</button>
                    <button onClick={submitSwapRequest} className="flex-1 py-2.5 rounded-xl bg-z-blue text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all">Submit Request</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;