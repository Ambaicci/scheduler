import { useState, useMemo } from 'react';
import { 
  CalendarIcon, MagnifyingGlassIcon, XMarkIcon, 
  ViewColumnsIcon, ListBulletIcon, FunnelIcon,
  PencilSquareIcon, TrashIcon, ArrowPathIcon,
  CheckCircleIcon, ExclamationTriangleIcon
} from '@heroicons/react/24/solid';
import { 
  DndContext, 
  DragOverlay, 
  useDraggable, 
  useDroppable,
  pointerWithin,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { API_BASE_URL } from '../config';

// ============ DRAGGABLE SHIFT COMPONENT ============
const DraggableShift = ({ shift, dotColor, onEdit }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `shift-${shift.assignment_id}`,
    data: { shift }
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onEdit(shift);
      }}
      className={`bg-z-page rounded-lg p-2 min-h-[50px] flex flex-col items-center justify-center gap-1 border border-z-border/50 hover:border-z-purple/50 transition-all cursor-grab active:cursor-grabbing group/shift relative ${
        isDragging ? 'opacity-30' : 'hover:shadow-md'
      }`}
      title="Click to edit • Drag to move"
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
      <span className="text-[11px] font-semibold text-z-text truncate w-full text-center">{shift.branch_name}</span>
      <span className="text-[10px] text-z-text-dim font-mono">{shift.start_time.substring(0,5)}-{shift.end_time.substring(0,5)}</span>
      
      {/* Edit Icon on Hover */}
      <div className="absolute top-1 right-1 opacity-0 group-hover/shift:opacity-100 transition-opacity">
        <PencilSquareIcon className="w-3 h-3 text-z-purple" />
      </div>
    </div>
  );
};

// ============ DROPPABLE CELL COMPONENT ============
const DroppableCell = ({ id, children, isOver }) => {
  const { setNodeRef } = useDroppable({ id });

  return (
    <td ref={setNodeRef} className="px-1 py-2 text-center">
      <div className={`min-h-[50px] rounded-lg transition-all ${
        isOver ? 'bg-z-purple/20 border-2 border-dashed border-z-purple' : 'bg-z-page/30'
      }`}>
        {children}
      </div>
    </td>
  );
};

// ============ TOAST COMPONENT ============
const Toast = ({ message, type = 'info', onClose }) => {
  const styles = {
    success: 'bg-z-green/10 border-z-green/30 text-z-green',
    error: 'bg-z-red/10 border-z-red/30 text-z-red',
    info: 'bg-z-blue/10 border-z-blue/30 text-z-blue',
  };
  const icons = {
    success: <CheckCircleIcon className="w-5 h-5 text-z-green flex-shrink-0" />,
    error: <ExclamationTriangleIcon className="w-5 h-5 text-z-red flex-shrink-0" />,
    info: <CheckCircleIcon className="w-5 h-5 text-z-blue flex-shrink-0" />,
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 animate-[slideDown_0.4s_ease-out]">
      <div className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-2xl ${styles[type]}`}>
        {icons[type]}
        <div className="flex-1">
          <p className="text-sm font-semibold font-body">{message}</p>
        </div>
        <button onClick={onClose} className="opacity-60 hover:opacity-100 transition-opacity">
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// ============ MAIN SCHEDULE QUERY COMPONENT ============
const ScheduleQuery = ({ roster, employees, branches }) => {
  // Filter State
  const [dateRange, setDateRange] = useState('thisWeek');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [naturalQuery, setNaturalQuery] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');

  // Drag & Drop State
  const [activeId, setActiveId] = useState(null);
  const [activeShift, setActiveShift] = useState(null);
  const [overId, setOverId] = useState(null);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Toast State
  const [toast, setToast] = useState(null);

  // Sensors for DnD (requires movement before activating drag)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  // Calculate date range
  const getDateRange = () => {
    const today = new Date();
    let start, end;
    if (dateRange === 'thisWeek') {
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      start = new Date(today); start.setDate(diff);
      end = new Date(start); end.setDate(start.getDate() + 6);
    } else if (dateRange === 'thisMonth') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (dateRange === 'nextWeek') {
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) + 7;
      start = new Date(today); start.setDate(diff);
      end = new Date(start); end.setDate(start.getDate() + 6);
    } else if (dateRange === 'custom' && customStartDate && customEndDate) {
      start = new Date(customStartDate);
      end = new Date(customEndDate);
    } else {
      return { start: null, end: null };
    }
    return { start, end };
  };

  const matchesTimeOfDay = (startTime) => {
    if (selectedTimeOfDay === 'all') return true;
    const hour = parseInt(startTime.substring(0, 2), 10);
    if (selectedTimeOfDay === 'morning') return hour >= 6 && hour < 12;
    if (selectedTimeOfDay === 'afternoon') return hour >= 12 && hour < 17;
    if (selectedTimeOfDay === 'evening') return hour >= 17 && hour < 22;
    if (selectedTimeOfDay === 'night') return hour >= 22 || hour < 6;
    return true;
  };

  const filteredResults = useMemo(() => {
    const { start, end } = getDateRange();
    return roster.filter(shift => {
      if (start && end) {
        const shiftDate = new Date(shift.date);
        if (shiftDate < start || shiftDate > end) return false;
      }
      if (selectedEmployee !== 'all') {
        const emp = employees.find(e => e.id === shift.user_id);
        if (!emp || emp.name !== selectedEmployee) return false;
      }
      if (selectedBranch !== 'all' && shift.branch_name !== selectedBranch) return false;
      if (selectedDays.length > 0 && !selectedDays.includes(shift.day)) return false;
      if (!matchesTimeOfDay(shift.start_time)) return false;
      return true;
    });
  }, [roster, dateRange, customStartDate, customEndDate, selectedEmployee, selectedBranch, selectedDays, selectedTimeOfDay, employees]);

  // ============ DRAG & DROP HANDLERS ============
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
    setActiveShift(event.active.data.current.shift);
  };

  const handleDragOver = (event) => {
    setOverId(event.over?.id || null);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveShift(null);
    setOverId(null);

    if (!over) return;

    const shift = active.data.current.shift;
    const overIdStr = over.id.toString();
    
    // Only handle drops on cells (format: cell-{empId}-{day})
    if (!overIdStr.startsWith('cell-')) return;

    const parts = overIdStr.split('-');
    if (parts.length !== 3) return;

    const newEmpId = parseInt(parts[1]);
    const newDay = parts[2];

    // If dropped on same cell, do nothing
    if (newEmpId === shift.user_id && newDay === shift.day) {
      return;
    }

    // Calculate new date based on the day of week
    const shiftDate = new Date(shift.date);
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDayIndex = daysOfWeek.indexOf(newDay);
    const currentDayIndex = shiftDate.getDay();
    const dayDiff = targetDayIndex - currentDayIndex;
    const newDate = new Date(shiftDate);
    newDate.setDate(shiftDate.getDate() + dayDiff);
    const newDateStr = newDate.toISOString().split('T')[0];

    // Run AI compliance check before moving
    setToast({ message: '🧠 Zing is checking compliance...', type: 'info' });
    
    try {
      const aiRes = await fetch(`${API_BASE_URL}/api/ai-check-swap?user_a_id=${shift.user_id}&user_b_id=${newEmpId}&assignment_id=${shift.assignment_id}`);
      const aiData = await aiRes.json();

      if (aiData.verdict === 'CLEAR' || aiData.verdict === 'UNKNOWN') {
        // Proceed with update
        const res = await fetch(`${API_BASE_URL}/api/assignment/${shift.assignment_id}?user_id=${newEmpId}&date=${newDateStr}`, { 
          method: 'PUT' 
        });
        const data = await res.json();
        
        if (data.success) {
          setToast({ message: `✅ Shift moved successfully! ${aiData.reason || ''}`, type: 'success' });
          // Refresh roster
          window.location.reload();
        } else {
          setToast({ message: `❌ Failed to move shift: ${data.detail || 'Unknown error'}`, type: 'error' });
        }
      } else {
        setToast({ message: `🚫 Move blocked by Zing: ${aiData.reason}`, type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: '❌ Error connecting to Zing', type: 'error' });
    }
  };

  // ============ EDIT MODAL HANDLERS ============
  const openEditModal = (shift) => {
    setEditingShift(shift);
    setEditForm({
      user_id: shift.user_id,
      date: shift.date,
      start_time: shift.start_time.substring(0, 5),
      end_time: shift.end_time.substring(0, 5),
      branch_id: branches.find(b => b.name === shift.branch_name)?.id || ''
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingShift) return;
    setSaving(true);
    
    try {
      const params = new URLSearchParams();
      if (editForm.user_id) params.append('user_id', editForm.user_id);
      if (editForm.date) params.append('date', editForm.date);
      if (editForm.start_time) params.append('start_time', editForm.start_time + ':00');
      if (editForm.end_time) params.append('end_time', editForm.end_time + ':00');
      if (editForm.branch_id) params.append('branch_id', editForm.branch_id);

      const res = await fetch(`${API_BASE_URL}/api/assignment/${editingShift.assignment_id}?${params.toString()}`, { 
        method: 'PUT' 
      });
      const data = await res.json();
      
      if (data.success) {
        setToast({ message: '✅ Shift updated successfully!', type: 'success' });
        setShowEditModal(false);
        setEditingShift(null);
        setTimeout(() => window.location.reload(), 800);
      } else {
        setToast({ message: `❌ Failed to update: ${data.detail || 'Unknown error'}`, type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: '❌ Error updating shift', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteShift = async () => {
    if (!editingShift) return;
    if (!confirm('Are you sure you want to delete this shift? This cannot be undone.')) return;
    
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/assignment/${editingShift.assignment_id}`, { 
        method: 'DELETE' 
      });
      const data = await res.json();
      
      if (data.success) {
        setToast({ message: '🗑️ Shift deleted successfully!', type: 'success' });
        setShowEditModal(false);
        setEditingShift(null);
        setTimeout(() => window.location.reload(), 800);
      } else {
        setToast({ message: `❌ Failed to delete: ${data.detail || 'Unknown error'}`, type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setToast({ message: '❌ Error deleting shift', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // ============ NATURAL LANGUAGE QUERY ============
  const handleNaturalQuery = async (query) => {
    if (!query.trim()) return;
    setIsParsing(true);
    setParseError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/zing-parse-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await response.json();
      if (data.success && data.filters) {
        const filters = data.filters;
        setSelectedEmployee('all');
        setSelectedBranch('all');
        setSelectedDays([]);
        setSelectedTimeOfDay('all');
        setDateRange('thisWeek');
        setCustomStartDate('');
        setCustomEndDate('');
        if (filters.employee) setSelectedEmployee(filters.employee);
        if (filters.branch) setSelectedBranch(filters.branch);
        if (filters.timeOfDay) setSelectedTimeOfDay(filters.timeOfDay);
        if (filters.dateRange) setDateRange(filters.dateRange);
        if (filters.days && filters.days.length > 0) setSelectedDays(filters.days);
        setNaturalQuery('');
      } else {
        setParseError(data.error || 'Could not parse query. Try using the filters below.');
      }
    } catch (err) {
      console.error('Query parsing error:', err);
      setParseError('Error connecting to AI. Try using the filters below.');
    } finally {
      setIsParsing(false);
    }
  };

  const toggleDay = (day) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const clearAllFilters = () => {
    setDateRange('thisWeek');
    setCustomStartDate('');
    setCustomEndDate('');
    setSelectedEmployee('all');
    setSelectedBranch('all');
    setSelectedDays([]);
    setSelectedTimeOfDay('all');
    setParseError('');
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (dateRange !== 'thisWeek') count++;
    if (selectedEmployee !== 'all') count++;
    if (selectedBranch !== 'all') count++;
    if (selectedDays.length > 0) count++;
    if (selectedTimeOfDay !== 'all') count++;
    return count;
  };

  const getDotColor = (branchName) => {
    if (branchName?.includes('Sabatia')) return 'bg-z-green';
    if (branchName?.includes('Navakholo')) return 'bg-z-purple';
    if (branchName?.includes('Wholesale')) return 'bg-z-orange';
    return 'bg-z-blue';
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <>
      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="space-y-6">
        {/* Natural Language Query Bar */}
        <div className="bg-z-surface rounded-2xl border border-z-border p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <MagnifyingGlassIcon className="w-5 h-5 text-z-text-dim flex-shrink-0" />
            <input
              type="text"
              value={naturalQuery}
              onChange={(e) => setNaturalQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isParsing && handleNaturalQuery(naturalQuery)}
              disabled={isParsing}
              placeholder="Ask Zing: 'Show me Dr. Kevin's schedule for Wednesday evening...'"
              className="flex-1 bg-transparent border-none outline-none text-sm text-z-text placeholder-z-text-faint font-body disabled:opacity-50"
            />
            {isParsing ? (
              <div className="flex items-center gap-2 px-4 py-1.5 bg-z-purple/10 text-z-purple text-xs font-semibold rounded-lg">
                <ArrowPathIcon className="w-3 h-3 animate-spin" />
                AI Parsing...
              </div>
            ) : naturalQuery ? (
              <button 
                onClick={() => handleNaturalQuery(naturalQuery)}
                className="px-4 py-1.5 bg-z-purple text-white text-xs font-semibold rounded-lg hover:opacity-90 active:scale-95 transition-all"
              >
                Search
              </button>
            ) : null}
          </div>
          {parseError && (
            <div className="mt-3 px-3 py-2 bg-z-red/10 border border-z-red/20 rounded-lg text-xs text-z-red">
              {parseError}
            </div>
          )}
        </div>

        {/* Filter Controls */}
        <div className="bg-z-surface rounded-2xl border border-z-border p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FunnelIcon className="w-4 h-4 text-z-purple" />
            <span className="text-sm font-semibold text-z-text">Filters</span>
            {getActiveFiltersCount() > 0 && (
              <span className="px-2 py-0.5 bg-z-purple/10 text-z-purple text-[10px] font-bold rounded-full">
                {getActiveFiltersCount()} active
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-mono font-semibold text-z-text-faint uppercase tracking-wider mb-1.5">Date Range</label>
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="w-full px-3 py-2 bg-z-page/50 border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:border-z-purple transition-all">
                <option value="thisWeek">This Week</option>
                <option value="thisMonth">This Month</option>
                <option value="nextWeek">Next Week</option>
                <option value="custom">Custom Range</option>
              </select>
              {dateRange === 'custom' && (
                <div className="mt-2 space-y-2">
                  <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="w-full px-3 py-2 bg-z-page/50 border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:border-z-purple transition-all" />
                  <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="w-full px-3 py-2 bg-z-page/50 border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:border-z-purple transition-all" />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold text-z-text-faint uppercase tracking-wider mb-1.5">Employee</label>
              <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="w-full px-3 py-2 bg-z-page/50 border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:border-z-purple transition-all">
                <option value="all">All Employees</option>
                {employees.filter(e => e.is_active).map(emp => (<option key={emp.id} value={emp.name}>{emp.name}</option>))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold text-z-text-faint uppercase tracking-wider mb-1.5">Branch</label>
              <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="w-full px-3 py-2 bg-z-page/50 border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:border-z-purple transition-all">
                <option value="all">All Branches</option>
                {branches.map(branch => (<option key={branch.id} value={branch.name}>{branch.name}</option>))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold text-z-text-faint uppercase tracking-wider mb-1.5">Time of Day</label>
              <select value={selectedTimeOfDay} onChange={(e) => setSelectedTimeOfDay(e.target.value)} className="w-full px-3 py-2 bg-z-page/50 border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:border-z-purple transition-all">
                <option value="all">All Times</option>
                <option value="morning">Morning (6AM-12PM)</option>
                <option value="afternoon">Afternoon (12PM-5PM)</option>
                <option value="evening">Evening (5PM-10PM)</option>
                <option value="night">Night (10PM-6AM)</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-mono font-semibold text-z-text-faint uppercase tracking-wider mb-2">Day of Week</label>
            <div className="flex flex-wrap gap-2">
              {days.map(day => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedDays.includes(day) ? 'bg-z-purple text-white' : 'bg-z-page/50 text-z-text-dim border border-z-border hover:border-z-purple/50'
                  }`}
                >
                  {day.substring(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {getActiveFiltersCount() > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {dateRange !== 'thisWeek' && (
                  <span className="px-2 py-1 bg-z-blue/10 text-z-blue text-[10px] font-bold rounded-lg flex items-center gap-1">
                    {dateRange === 'thisMonth' ? 'This Month' : dateRange === 'nextWeek' ? 'Next Week' : 'Custom'}
                    <button onClick={() => setDateRange('thisWeek')}><XMarkIcon className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedEmployee !== 'all' && (
                  <span className="px-2 py-1 bg-z-green/10 text-z-green text-[10px] font-bold rounded-lg flex items-center gap-1">
                    {selectedEmployee}
                    <button onClick={() => setSelectedEmployee('all')}><XMarkIcon className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedBranch !== 'all' && (
                  <span className="px-2 py-1 bg-z-orange/10 text-z-orange text-[10px] font-bold rounded-lg flex items-center gap-1">
                    {selectedBranch}
                    <button onClick={() => setSelectedBranch('all')}><XMarkIcon className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedDays.length > 0 && (
                  <span className="px-2 py-1 bg-z-purple/10 text-z-purple text-[10px] font-bold rounded-lg flex items-center gap-1">
                    {selectedDays.length} day{selectedDays.length > 1 ? 's' : ''}
                    <button onClick={() => setSelectedDays([])}><XMarkIcon className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedTimeOfDay !== 'all' && (
                  <span className="px-2 py-1 bg-z-blue/10 text-z-blue text-[10px] font-bold rounded-lg flex items-center gap-1">
                    {selectedTimeOfDay}
                    <button onClick={() => setSelectedTimeOfDay('all')}><XMarkIcon className="w-3 h-3" /></button>
                  </span>
                )}
              </div>
              <button onClick={clearAllFilters} className="text-xs text-z-text-dim hover:text-z-red font-semibold transition-colors">
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-display font-bold text-z-text">Schedule Results</h2>
            <span className="text-sm text-z-text-dim font-mono">Showing {filteredResults.length} of {roster.length} shifts</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-z-purple text-white' : 'bg-z-page/50 text-z-text-dim hover:text-z-text'}`}>
              <ViewColumnsIcon className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-z-purple text-white' : 'bg-z-page/50 text-z-text-dim hover:text-z-text'}`}>
              <ListBulletIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results Display */}
        {filteredResults.length === 0 ? (
          <div className="bg-z-surface rounded-2xl border border-z-border p-12 text-center">
            <CalendarIcon className="w-16 h-16 text-z-text-dim mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-display font-semibold text-z-text mb-1">No shifts found</h3>
            <p className="text-sm text-z-text-dim font-mono">Try adjusting your filters</p>
          </div>
        ) : viewMode === 'grid' ? (
          // ============ GRID VIEW WITH DRAG & DROP ============
          <DndContext 
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="bg-z-surface rounded-2xl border border-z-border p-6 overflow-hidden shadow-sm">
              <div className="mb-4 p-3 bg-z-purple/5 border border-z-purple/20 rounded-xl">
                <p className="text-xs text-z-purple font-mono">
                  💡 <strong>Pro tip:</strong> Drag any shift to move it. Click to edit. Zing will auto-check compliance.
                </p>
              </div>
              <div className="overflow-x-auto -mx-2 px-2 pb-2">
                <table className="w-full text-sm border-collapse min-w-[700px]">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left font-mono font-bold text-z-text-faint sticky left-0 bg-z-surface z-10 w-[150px]">Employee</th>
                      {days.map(day => (
                        <th key={day} className="px-1 py-3 text-center font-mono font-bold text-z-text-faint w-[100px]">
                          {day.substring(0, 3)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {employees.filter(emp => emp.is_active !== false).map((emp) => {
                      const employeeShifts = {};
                      days.forEach(day => { 
                        employeeShifts[day] = filteredResults.find(s => s.user_id === emp.id && s.day === day); 
                      });
                      return (
                        <tr key={emp.id} className="group">
                          <td className="px-4 py-2 sticky left-0 bg-z-surface group-hover:bg-z-surface-hi z-10 transition-colors border-r border-z-border/50">
                            <div className="font-semibold text-z-text text-sm">{emp.name}</div>
                            <div className="text-xs text-z-text-dim font-mono">{emp.job_title}</div>
                          </td>
                          {days.map(day => {
                            const shift = employeeShifts[day];
                            const cellId = `cell-${emp.id}-${day}`;
                            const isOver = overId === cellId;
                            
                            return (
                              <DroppableCell key={`${emp.id}-${day}`} id={cellId} isOver={isOver}>
                                {shift ? (
                                  <DraggableShift 
                                    shift={shift} 
                                    dotColor={getDotColor(shift.branch_name)} 
                                    onEdit={openEditModal}
                                  />
                                ) : (
                                  <div className="flex items-center justify-center min-h-[50px]">
                                    <span className="text-[11px] text-z-text-faint italic font-mono">Off</span>
                                  </div>
                                )}
                              </DroppableCell>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Drag Overlay - Visual Preview While Dragging */}
            <DragOverlay>
              {activeShift ? (
                <div className="bg-z-purple text-white rounded-lg p-3 shadow-2xl shadow-z-purple/50 cursor-grabbing min-w-[120px]">
                  <div className="text-xs font-mono opacity-80 mb-1">Moving Shift</div>
                  <div className="text-sm font-bold">{activeShift.branch_name}</div>
                  <div className="text-xs opacity-90">{activeShift.start_time.substring(0,5)}-{activeShift.end_time.substring(0,5)}</div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          // List View
          <div className="space-y-3">
            {filteredResults.map((shift, idx) => {
              const emp = employees.find(e => e.id === shift.user_id);
              const dotColor = getDotColor(shift.branch_name);
              return (
                <div 
                  key={idx} 
                  onClick={() => openEditModal(shift)}
                  className="bg-z-surface rounded-xl border border-z-border p-4 flex items-center gap-4 hover:border-z-border/80 transition-all cursor-pointer"
                >
                  <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-display font-semibold text-sm text-white ${dotColor}`}>
                    {emp ? emp.name.split(' ').map(n => n[0]).join('').substring(0, 2) : '??'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-z-text">{emp?.name || 'Unassigned'}</span>
                      <span className="text-xs text-z-text-dim font-mono">{shift.day}, {new Date(shift.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-z-text-dim">
                      <span className="font-mono">{shift.start_time.substring(0,5)} - {shift.end_time.substring(0,5)}</span>
                      <span>{shift.branch_name}</span>
                      <span className="text-z-text-faint">{emp?.job_title}</span>
                    </div>
                  </div>
                  <PencilSquareIcon className="w-4 h-4 text-z-text-faint" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============ EDIT SHIFT MODAL ============ */}
      {showEditModal && editingShift && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-z-bg rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl border border-z-border">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-display font-bold text-z-text">Edit Shift</h3>
                <p className="text-xs text-z-text-dim font-mono mt-1">Make changes to this assignment</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-z-text-dim hover:text-z-text transition-colors bg-z-surface p-1 rounded-full">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-semibold text-z-text-faint uppercase tracking-wider mb-1.5">Employee</label>
                <select 
                  value={editForm.user_id || ''} 
                  onChange={(e) => setEditForm({...editForm, user_id: parseInt(e.target.value)})}
                  className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:border-z-purple transition-all"
                >
                  {employees.filter(e => e.is_active).map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.job_title})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-z-text-faint uppercase tracking-wider mb-1.5">Date</label>
                <input 
                  type="date" 
                  value={editForm.date || ''} 
                  onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                  className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:border-z-purple transition-all" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-semibold text-z-text-faint uppercase tracking-wider mb-1.5">Start Time</label>
                  <input 
                    type="time" 
                    value={editForm.start_time || ''} 
                    onChange={(e) => setEditForm({...editForm, start_time: e.target.value})}
                    className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:border-z-purple transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-semibold text-z-text-faint uppercase tracking-wider mb-1.5">End Time</label>
                  <input 
                    type="time" 
                    value={editForm.end_time || ''} 
                    onChange={(e) => setEditForm({...editForm, end_time: e.target.value})}
                    className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:border-z-purple transition-all" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-z-text-faint uppercase tracking-wider mb-1.5">Branch</label>
                <select 
                  value={editForm.branch_id || ''} 
                  onChange={(e) => setEditForm({...editForm, branch_id: parseInt(e.target.value)})}
                  className="w-full px-4 py-2.5 bg-z-surface border border-z-border rounded-xl text-sm text-z-text focus:outline-none focus:border-z-purple transition-all"
                >
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-z-border">
                <button 
                  onClick={handleDeleteShift}
                  disabled={saving}
                  className="px-4 py-2.5 bg-z-red/10 text-z-red border border-z-red/20 rounded-xl text-sm font-semibold hover:bg-z-red/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <TrashIcon className="w-4 h-4" />
                  Delete
                </button>
                <button 
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-z-blue text-white rounded-xl text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>Save Changes</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ScheduleQuery;