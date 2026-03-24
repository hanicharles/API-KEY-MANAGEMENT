import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import KeysList from './pages/KeysList';
import KeyDetail from './pages/KeyDetail';
import Auth from './pages/Auth';
import Profile from './pages/Profile';

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [selectedKeyId, setSelectedKeyId] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const navigate = (p, id = null) => {
    setPage(p);
    setSelectedKeyId(id);
    window.scrollTo(0, 0);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (!user) {
    return <Auth onAuthSuccess={(u) => setUser(u)} />;
  }

  const handleUpdateSession = (updatedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar page={page} navigate={navigate} onLogout={handleLogout} user={user} />
      <main style={{ flex: 1, padding: '32px', overflowY: 'auto', background: 'var(--bg)' }}>
        {page === 'dashboard' && <Dashboard navigate={navigate} />}
        {page === 'keys' && <KeysList navigate={navigate} />}
        {page === 'detail' && <KeyDetail id={selectedKeyId} navigate={navigate} />}
        {page === 'profile' && <Profile user={user} onUpdateSession={handleUpdateSession} />}
      </main>
    </div>
  );
}
