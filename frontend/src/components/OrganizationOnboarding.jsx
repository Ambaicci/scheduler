import { useState } from 'react';
import { 
  BuildingOfficeIcon, MapPinIcon, UserGroupIcon, 
  DocumentTextIcon, CheckCircleIcon, ArrowRightIcon, 
  ArrowLeftIcon, ArrowUpTrayIcon, XMarkIcon, SparklesIcon,
  PlusIcon, TrashIcon
} from '@heroicons/react/24/solid';
import { API_BASE_URL } from '../config';

const OrganizationOnboarding = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [orgData, setOrgData] = useState({ name: '', industry: '' });
  const [locations, setLocations] = useState([{ name: '', address: '' }]);
  const [roles, setRoles] = useState([{ name: '', max_hours_per_week: 40 }]);
  const [csvFile, setCsvFile] = useState(null);
  const [importResults, setImportResults] = useState(null);

  const handleNext = () => {
    setError('');
    if (step === 1 && (!orgData.name || !orgData.industry)) {
      setError('Please fill in all organization fields.');
      return;
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => setStep(prev => prev - 1);

  // Location Handlers
  const addLocation = () => setLocations([...locations, { name: '', address: '' }]);
  const removeLocation = (index) => setLocations(locations.filter((_, i) => i !== index));
  const updateLocation = (index, field, value) => {
    const updated = [...locations];
    updated[index][field] = value;
    setLocations(updated);
  };

  // Role Handlers
  const addRole = () => setRoles([...roles, { name: '', max_hours_per_week: 40 }]);
  const removeRole = (index) => setRoles(roles.filter((_, i) => i !== index));
  const updateRole = (index, field, value) => {
    const updated = [...roles];
    updated[index][field] = field === 'max_hours_per_week' ? parseFloat(value) : value;
    setRoles(updated);
  };

  // CSV Template Download
  const downloadTemplate = () => {
    const csvContent = "name,email,job_title,phone_number,max_hours_per_week\nJohn Doe,john@example.com,Pharmacist,555-0100,45\nJane Smith,jane@example.com,Cashier,555-0101,40";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_import_template.csv';
    a.click();
  };

  // Final Submission
  const handleFinish = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Create Organization
      const orgRes = await fetch(`${API_BASE_URL}/api/organizations?name=${encodeURIComponent(orgData.name)}&industry=${encodeURIComponent(orgData.industry)}`, { method: 'POST' });
      const orgData_res = await orgRes.json();
      const orgId = orgData_res.organization.id;

      // 2. Create Locations
      for (const loc of locations) {
        if (loc.name) {
          await fetch(`${API_BASE_URL}/api/locations?organization_id=${orgId}&name=${encodeURIComponent(loc.name)}&address=${encodeURIComponent(loc.address)}`, { method: 'POST' });
        }
      }

      // 3. Create Roles
      for (const role of roles) {
        if (role.name) {
          await fetch(`${API_BASE_URL}/api/roles?organization_id=${orgId}&name=${encodeURIComponent(role.name)}&max_hours_per_week=${role.max_hours_per_week}`, { method: 'POST' });
        }
      }

      // 4. Bulk Import Employees (if file exists)
      if (csvFile) {
        const formData = new FormData();
        formData.append('file', csvFile);
        const importRes = await fetch(`${API_BASE_URL}/api/employees/bulk-import?organization_id=${orgId}`, {
          method: 'POST',
          body: formData
        });
        const importData = await importRes.json();
        setImportResults(importData);
        
        if (importData.error_count > 0) {
          setError(`Imported ${importData.imported_count} employees, but ${importData.error_count} had errors. Check results below.`);
        }
      }

      // Success!
      setTimeout(() => {
        onComplete();
      }, 2000);

    } catch (err) {
      console.error(err);
      setError('An error occurred during setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render Steps
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-z-purple/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BuildingOfficeIcon className="w-8 h-8 text-z-purple" />
              </div>
              <h2 className="text-2xl font-display font-bold text-z-text">Tell us about your organization</h2>
              <p className="text-z-text-dim mt-2">This helps us customize your Zing experience.</p>
            </div>
            <div className="space-y-4 max-w-md mx-auto">
              <div>
                <label className="block text-sm font-semibold text-z-text mb-1.5">Organization Name</label>
                <input type="text" value={orgData.name} onChange={(e) => setOrgData({...orgData, name: e.target.value})} placeholder="e.g., Chebu Pharmacy" className="w-full px-4 py-3 bg-z-surface border border-z-border rounded-xl text-z-text focus:outline-none focus:border-z-purple focus:ring-1 focus:ring-z-purple/30 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-z-text mb-1.5">Industry</label>
                <select value={orgData.industry} onChange={(e) => setOrgData({...orgData, industry: e.target.value})} className="w-full px-4 py-3 bg-z-surface border border-z-border rounded-xl text-z-text focus:outline-none focus:border-z-purple focus:ring-1 focus:ring-z-purple/30 transition-all">
                  <option value="">Select an industry...</option>
                  <option value="Healthcare">Healthcare / Pharmacy</option>
                  <option value="Retail">Retail</option>
                  <option value="Hospitality">Hospitality</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-z-blue/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MapPinIcon className="w-8 h-8 text-z-blue" />
              </div>
              <h2 className="text-2xl font-display font-bold text-z-text">Where do you operate?</h2>
              <p className="text-z-text-dim mt-2">Add your branches, stores, or office locations.</p>
            </div>
            <div className="space-y-4 max-w-2xl mx-auto">
              {locations.map((loc, index) => (
                <div key={index} className="bg-z-surface border border-z-border rounded-xl p-4 flex gap-4 items-start">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" value={loc.name} onChange={(e) => updateLocation(index, 'name', e.target.value)} placeholder="Location Name (e.g., Mumias Branch)" className="w-full px-4 py-2.5 bg-z-page/50 border border-z-border rounded-lg text-z-text focus:outline-none focus:border-z-purple transition-all" />
                    <input type="text" value={loc.address} onChange={(e) => updateLocation(index, 'address', e.target.value)} placeholder="Address or City" className="w-full px-4 py-2.5 bg-z-page/50 border border-z-border rounded-lg text-z-text focus:outline-none focus:border-z-purple transition-all" />
                  </div>
                  {locations.length > 1 && (
                    <button onClick={() => removeLocation(index)} className="p-2 text-z-text-dim hover:text-z-red hover:bg-z-red/10 rounded-lg transition-all">
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addLocation} className="w-full py-3 border border-dashed border-z-border rounded-xl text-z-text-dim hover:text-z-purple hover:border-z-purple hover:bg-z-purple/5 transition-all flex items-center justify-center gap-2 font-semibold">
                <PlusIcon className="w-5 h-5" /> Add Another Location
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-z-green/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <UserGroupIcon className="w-8 h-8 text-z-green" />
              </div>
              <h2 className="text-2xl font-display font-bold text-z-text">Define your roles</h2>
              <p className="text-z-text-dim mt-2">What job titles do your employees have?</p>
            </div>
            <div className="space-y-4 max-w-2xl mx-auto">
              {roles.map((role, index) => (
                <div key={index} className="bg-z-surface border border-z-border rounded-xl p-4 flex gap-4 items-start">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" value={role.name} onChange={(e) => updateRole(index, 'name', e.target.value)} placeholder="Role (e.g., Pharmacist)" className="md:col-span-2 w-full px-4 py-2.5 bg-z-page/50 border border-z-border rounded-lg text-z-text focus:outline-none focus:border-z-purple transition-all" />
                    <input type="number" value={role.max_hours_per_week} onChange={(e) => updateRole(index, 'max_hours_per_week', e.target.value)} placeholder="Max Hrs/Week" className="w-full px-4 py-2.5 bg-z-page/50 border border-z-border rounded-lg text-z-text focus:outline-none focus:border-z-purple transition-all" />
                  </div>
                  {roles.length > 1 && (
                    <button onClick={() => removeRole(index)} className="p-2 text-z-text-dim hover:text-z-red hover:bg-z-red/10 rounded-lg transition-all">
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addRole} className="w-full py-3 border border-dashed border-z-border rounded-xl text-z-text-dim hover:text-z-green hover:border-z-green hover:bg-z-green/5 transition-all flex items-center justify-center gap-2 font-semibold">
                <PlusIcon className="w-5 h-5" /> Add Another Role
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-z-orange/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <DocumentTextIcon className="w-8 h-8 text-z-orange" />
              </div>
              <h2 className="text-2xl font-display font-bold text-z-text">Import your team</h2>
              <p className="text-z-text-dim mt-2">Upload a CSV file to add employees in bulk, or skip for now.</p>
            </div>
            <div className="max-w-md mx-auto space-y-6">
              <div 
                onClick={() => document.getElementById('csv-upload').click()}
                className="border-2 border-dashed border-z-border rounded-2xl p-8 text-center hover:border-z-purple hover:bg-z-purple/5 transition-all cursor-pointer group"
              >
                <ArrowUpTrayIcon className="w-12 h-12 text-z-text-dim mx-auto mb-3 group-hover:text-z-purple transition-colors" />
                <p className="text-sm font-semibold text-z-text">Click to upload CSV</p>
                <p className="text-xs text-z-text-dim mt-1">or drag and drop</p>
                <input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={(e) => setCsvFile(e.target.files[0])} />
              </div>
              
              {csvFile && (
                <div className="bg-z-green/10 border border-z-green/20 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-z-green" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-z-green truncate">{csvFile.name}</p>
                    <p className="text-xs text-z-text-dim">{(csvFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button onClick={() => setCsvFile(null)} className="text-z-text-dim hover:text-z-red">
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              )}

              <button onClick={downloadTemplate} className="w-full py-2.5 text-sm font-semibold text-z-blue hover:text-z-purple transition-colors flex items-center justify-center gap-2">
                <DocumentTextIcon className="w-4 h-4" /> Download CSV Template
              </button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-z-purple/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <SparklesIcon className="w-8 h-8 text-z-purple" />
              </div>
              <h2 className="text-2xl font-display font-bold text-z-text">Ready to launch!</h2>
              <p className="text-z-text-dim mt-2">Review your setup and let Zing do the rest.</p>
            </div>
            
            <div className="max-w-md mx-auto bg-z-surface border border-z-border rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-z-border">
                <span className="text-sm text-z-text-dim">Organization</span>
                <span className="text-sm font-semibold text-z-text">{orgData.name}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-z-border">
                <span className="text-sm text-z-text-dim">Locations</span>
                <span className="text-sm font-semibold text-z-text">{locations.filter(l => l.name).length} added</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-z-border">
                <span className="text-sm text-z-text-dim">Roles</span>
                <span className="text-sm font-semibold text-z-text">{roles.filter(r => r.name).length} defined</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-z-text-dim">Employees</span>
                <span className="text-sm font-semibold text-z-text">{csvFile ? 'Ready to import' : 'Skipped'}</span>
              </div>
            </div>

            {importResults && (
              <div className="max-w-md mx-auto bg-z-blue/10 border border-z-blue/20 rounded-xl p-4">
                <p className="text-sm font-semibold text-z-blue mb-2">Import Results:</p>
                <p className="text-xs text-z-text-dim">✅ {importResults.imported_count} employees imported successfully.</p>
                {importResults.error_count > 0 && (
                  <p className="text-xs text-z-red mt-1">⚠️ {importResults.error_count} errors (check console for details).</p>
                )}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-z-page z-50 flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-z-border flex items-center justify-between bg-z-bg/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-z-purple rounded-lg flex items-center justify-center">
            <SparklesIcon className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-z-text">Zing Setup</span>
        </div>
        <button onClick={onComplete} className="text-sm text-z-text-dim hover:text-z-text transition-colors">Skip for now</button>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-4 bg-z-bg/50">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between text-xs font-mono font-semibold text-z-text-dim mb-2">
            <span>Step {step} of 5</span>
            <span>{Math.round((step / 5) * 100)}% Complete</span>
          </div>
          <div className="h-2 bg-z-surface rounded-full overflow-hidden">
            <div 
              className="h-full bg-z-purple transition-all duration-500 ease-out"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        {renderStep()}
        {error && (
          <div className="max-w-md mx-auto mt-6 p-4 bg-z-red/10 border border-z-red/20 rounded-xl text-sm text-z-red text-center">
            {error}
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="px-6 py-4 border-t border-z-border bg-z-bg/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <button 
            onClick={handleBack} 
            disabled={step === 1 || loading}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-z-text-dim hover:text-z-text hover:bg-z-surface transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ArrowLeftIcon className="w-4 h-4" /> Back
          </button>
          
          {step < 5 ? (
            <button 
              onClick={handleNext}
              disabled={loading}
              className="px-8 py-2.5 bg-z-purple text-white rounded-xl text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
            >
              Next Step <ArrowRightIcon className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={handleFinish}
              disabled={loading}
              className="px-8 py-2.5 bg-z-green text-white rounded-xl text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Setting up...
                </>
              ) : (
                <>Launch Zing <CheckCircleIcon className="w-4 h-4" /></>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizationOnboarding;