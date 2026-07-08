import { useState } from 'react';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';

function App() {
  const [user, setUser] = useState(null);

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  if (user.role === 'ADMIN') {
    return <AdminDashboard user={user} onLogout={() => setUser(null)} />;
  }

  return <EmployeeDashboard user={user} onLogout={() => setUser(null)} />;
}

export default App;