import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';

interface LoginProps {
  onLogin: (token: string, user: any) => void;
}

function Login({ onLogin }: LoginProps) {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(usernameOrEmail, password);
      onLogin(response.data.token, response.data.user);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <div className="card">
        <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Water Conservation Game</h2>
        <h3 style={{ textAlign: 'center', marginBottom: '24px', color: '#666' }}>Login</h3>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="input"
            placeholder="Username or Email"
            value={usernameOrEmail}
            onChange={(e) => setUsernameOrEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '16px' }}>
          Don't have an account? <Link to="/register" style={{ color: '#667eea', fontWeight: 600 }}>Register</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
