import { useState, useEffect } from 'react';
import { waterAPI } from '../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  user: any;
}

function Dashboard({ user }: DashboardProps) {
  const [stats, setStats] = useState<any>(null);
  const [dailySummary, setDailySummary] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [activityType, setActivityType] = useState('shower');
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, summaryRes] = await Promise.all([
        waterAPI.getStats(),
        waterAPI.getDailySummary(30)
      ]);

      setStats(statsRes.data.stats);
      setDailySummary(summaryRes.data.summary.reverse());
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordUsage = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecording(true);
    setMessage('');

    try {
      const response = await waterAPI.recordUsage(parseFloat(amount), 'liters', undefined, activityType);

      setMessage('Water usage recorded successfully!');

      if (response.data.completedChallenges && response.data.completedChallenges.length > 0) {
        setMessage(`Water usage recorded! You completed ${response.data.completedChallenges.length} challenge(s)!`);
      }

      setAmount('');
      await loadData();
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Failed to record usage');
    } finally {
      setRecording(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">⭐ {stats?.total_points || 0}</div>
          <div className="stat-label">Total Points</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">Lv {stats?.level || 1}</div>
          <div className="stat-label">Level</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">💧 {Math.round(stats?.total_savings || 0)}L</div>
          <div className="stat-label">Water Saved</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">#{stats?.current_rank || '-'}</div>
          <div className="stat-label">Rank</div>
        </div>
      </div>

      <div className="card">
        <h2>Record Water Usage</h2>
        {message && (
          <div className={message.includes('Failed') ? 'error' : 'success'}>
            {message}
          </div>
        )}
        <form onSubmit={handleRecordUsage}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '12px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Amount (Liters)</label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g., 50"
                required
                style={{ marginBottom: 0 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Activity</label>
              <select
                className="input"
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                style={{ marginBottom: 0 }}
              >
                <option value="shower">Shower</option>
                <option value="dishwashing">Dishwashing</option>
                <option value="laundry">Laundry</option>
                <option value="toilet">Toilet</option>
                <option value="gardening">Gardening</option>
                <option value="cooking">Cooking</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={recording}>
              {recording ? 'Recording...' : 'Record'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Water Usage Trend (Last 30 Days)</h2>
        {dailySummary.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailySummary}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="total_usage" stroke="#667eea" fill="#667eea" fillOpacity={0.6} name="Usage (L)" />
              <Area type="monotone" dataKey="savings" stroke="#27ae60" fill="#27ae60" fillOpacity={0.4} name="Savings (L)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ textAlign: 'center', padding: '40px', color: '#999' }}>No usage data yet. Start recording your water usage!</p>
        )}
      </div>

      <div className="card">
        <h2>Quick Stats</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <h3 style={{ color: '#667eea', marginBottom: '8px' }}>Total Usage</h3>
            <p style={{ fontSize: '24px', fontWeight: 600 }}>{Math.round(stats?.total_usage || 0)} L</p>
          </div>
          <div>
            <h3 style={{ color: '#667eea', marginBottom: '8px' }}>Achievements</h3>
            <p style={{ fontSize: '24px', fontWeight: 600 }}>{stats?.achievements_earned || 0}</p>
          </div>
          <div>
            <h3 style={{ color: '#667eea', marginBottom: '8px' }}>Challenges Completed</h3>
            <p style={{ fontSize: '24px', fontWeight: 600 }}>{stats?.challenges_completed || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
