import { useState } from 'react';
import { EnvelopeIcon, LockClosedIcon, UserIcon } from '@heroicons/react/24/outline';
import { API_BASE_URL } from '../config'; // <-- IMPORTED API URL

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // <-- UPDATED TO USE API_BASE_URL
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMessage('');

    try {
      // <-- UPDATED TO USE API_BASE_URL
      const response = await fetch(`${API_BASE_URL}/api/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email_or_id: resetEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Reset failed');
      }

      setResetMessage('✅ Password reset instructions sent!');
      setTimeout(() => {
        setShowReset(false);
        setResetMessage('');
        setResetEmail('');
      }, 5000);
    } catch (err) {
      setResetMessage(`❌ ${err.message}`);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F2F2F7] to-[#E5E5EA] p-4">
      <div className="w-full max-w-sm">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#007AFF] rounded-2xl shadow-lg shadow-[#007AFF]/20 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[#1C1C1E] tracking-tight">CHEBU</h1>
          <p className="text-sm text-[#8E8E93] mt-1 font-medium">Powered by <span className="text-[#007AFF]">Coffeesoft</span></p>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
          {/* Error Message */}
          {error && (
            <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-[#FF3B30] px-4 py-3 rounded-xl text-sm mb-4">
              {error}
            </div>
          )}

          {/* Login Form */}
          {!showReset ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#3A3A3C] mb-1.5">Email or Employee ID</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-[#8E8E93]" />
                  </div>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all text-[#1C1C1E] placeholder:text-[#8E8E93]"
                    placeholder="Email or Employee ID"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3A3A3C] mb-1.5">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-[#8E8E93]" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all text-[#1C1C1E] placeholder:text-[#8E8E93]"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#007AFF] text-white py-3 rounded-xl hover:opacity-85 active:scale-[0.98] transition-all duration-200 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#007AFF]/25"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowReset(true)}
                  className="text-sm text-[#007AFF] hover:opacity-70 transition-opacity font-medium"
                >
                  Forgot password?
                </button>
              </div>
            </form>
          ) : (
            /* Password Reset Form */
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#3A3A3C] mb-1.5">Email or Employee ID</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-[#8E8E93]" />
                  </div>
                  <input
                    type="text"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all text-[#1C1C1E] placeholder:text-[#8E8E93]"
                    placeholder="Email or Employee ID"
                    required
                  />
                </div>
              </div>

              {resetMessage && (
                <div className={`p-3 rounded-xl text-sm ${resetMessage.includes('✅') ? 'bg-[#34C759]/10 border border-[#34C759]/20 text-[#34C759]' : 'bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-[#FF3B30]'}`}>
                  {resetMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full bg-[#007AFF] text-white py-3 rounded-xl hover:opacity-85 active:scale-[0.98] transition-all duration-200 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#007AFF]/25"
              >
                {resetLoading ? 'Sending...' : 'Send Reset Instructions'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowReset(false);
                    setResetMessage('');
                    setResetEmail('');
                  }}
                  className="text-sm text-[#8E8E93] hover:text-[#3A3A3C] transition-colors font-medium"
                >
                  ← Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* Demo Credentials */}
          <div className="mt-6 pt-4 border-t border-[#E5E5EA]">
            <p className="text-xs text-[#8E8E93] text-center font-medium">
              Demo Credentials
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs text-[#8E8E93] mt-1.5">
              <span className="bg-[#F2F2F7] px-2 py-0.5 rounded-full">Admin: admin@coffeesoft.com</span>
              <span className="text-[#C7C7CC]">·</span>
              <span className="bg-[#F2F2F7] px-2 py-0.5 rounded-full">Employee: CHEBU-001</span>
            </div>
            <p className="text-xs text-[#8E8E93] text-center mt-1.5">
              Password: <span className="font-mono bg-[#F2F2F7] px-1.5 py-0.5 rounded">admin123</span> / <span className="font-mono bg-[#F2F2F7] px-1.5 py-0.5 rounded">employee123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;