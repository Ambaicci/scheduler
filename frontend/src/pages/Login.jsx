import { useState } from 'react';
import { UserIcon, LockClosedIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import { API_BASE_URL } from '../config';

// 1. Accept the onLogin prop from App.jsx
const Login = ({ onLogin }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Invalid credentials');
      }

      // 2. Save to localStorage using the EXACT keys App.jsx expects
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user_role', data.role);
      localStorage.setItem('user_id', data.user_id);
      localStorage.setItem('user_name', data.name);
      localStorage.setItem('employee_id', data.employee_id || '');

      // 3. Tell App.jsx to switch the view (No URL changes, no flickering!)
      if (onLogin) {
        onLogin(data);
      }

    } catch (err) {
      setError(err.message || 'Failed to connect to Zing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-z-page flex items-center justify-center p-4 relative overflow-hidden font-body text-z-text">
      
      {/* Ambient Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-z-purple/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-z-blue/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Main Glass Card */}
      <div className="relative w-full max-w-md bg-z-surface/60 backdrop-blur-2xl border border-z-border rounded-3xl p-8 shadow-2xl shadow-black/50">
        
        {/* Wordmark & Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-z-purple shadow-[0_0_12px_rgba(191,90,242,0.8)]"></div>
            <span className="font-display font-bold text-2xl tracking-tight text-z-text">ZING</span>
          </div>
          <h1 className="font-display font-semibold text-2xl text-z-text mb-2">Welcome back</h1>
          <p className="text-sm text-z-text-dim font-mono">Enter your credentials to access the workspace.</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-z-red/10 border border-z-red/20 flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-z-red flex-shrink-0"></div>
            <span className="text-xs text-z-red font-medium">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          
          {/* Identifier Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-semibold text-z-text-faint uppercase tracking-wider ml-1">
              Email or Employee ID
            </label>
            <div className="relative group">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-z-text-faint group-focus-within:text-z-purple transition-colors" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full bg-z-page/50 border border-z-border rounded-xl py-3 pl-11 pr-4 text-sm text-z-text placeholder-z-text-faint focus:outline-none focus:border-z-purple focus:ring-1 focus:ring-z-purple/30 transition-all"
                placeholder="e.g., admin@zing.com or CHEBU-001"
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-semibold text-z-text-faint uppercase tracking-wider ml-1">
              Password
            </label>
            <div className="relative group">
              <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-z-text-faint group-focus-within:text-z-purple transition-colors" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-z-page/50 border border-z-border rounded-xl py-3 pl-11 pr-4 text-sm text-z-text placeholder-z-text-faint focus:outline-none focus:border-z-purple focus:ring-1 focus:ring-z-purple/30 transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !identifier || !password}
            className="w-full mt-8 bg-z-blue text-white font-semibold text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 transition-all shadow-[0_4px_14px_rgba(10,132,255,0.3)]"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In to Zing</span>
                <ArrowRightIcon className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-[11px] text-z-text-faint font-mono">
            Protected by Zing Security Protocol v1.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;