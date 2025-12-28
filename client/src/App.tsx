import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Leaderboard from './components/Leaderboard';
import Challenges from './components/Challenges';
import Achievements from './components/Achievements';
import Rewards from './components/Rewards';
import Navbar from './components/Navbar';
import { authAPI } from './services/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await authAPI.getCurrentUser();
        setUser(response.data.user);
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      }
    }
    setLoading(false);
  };

  const handleLogin = (token: string, userData: any) => {
    localStorage.setItem('token', token);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  if (loading) {
    return <div className="loading">Loading Water Conservation Game...</div>;
  }

  if (!isAuthenticated) {
    return (
      <Router>
        <div className="app">
          <Routes>
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/register" element={<Register onRegister={handleLogin} />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </div>
      </Router>
    );
  }

  return (
    <Router>
      <div className="app">
        <div className="container">
          <Navbar user={user} onLogout={handleLogout} />
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route path="/leaderboard" element={<Leaderboard user={user} />} />
            <Route path="/challenges" element={<Challenges />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/rewards" element={<Rewards user={user} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
