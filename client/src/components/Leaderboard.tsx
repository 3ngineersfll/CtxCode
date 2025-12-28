import { useState, useEffect } from 'react';
import { leaderboardAPI } from '../services/api';

interface LeaderboardProps {
  user: any;
}

function Leaderboard({ user }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [period, setPeriod] = useState('all-time');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [period]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await leaderboardAPI.getLeaderboard(period, 50);
      setLeaderboard(response.data.leaderboard);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2>Leaderboard</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`btn ${period === 'daily' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPeriod('daily')}
            >
              Daily
            </button>
            <button
              className={`btn ${period === 'weekly' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPeriod('weekly')}
            >
              Weekly
            </button>
            <button
              className={`btn ${period === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPeriod('monthly')}
            >
              Monthly
            </button>
            <button
              className={`btn ${period === 'all-time' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPeriod('all-time')}
            >
              All-Time
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading leaderboard...</div>
        ) : leaderboard.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            No data available for this period
          </div>
        ) : (
          <div>
            {leaderboard.map((entry) => (
              <div
                key={entry.id}
                className="leaderboard-item"
                style={{
                  background: entry.user_id === user?.id ? '#e8f4f8' : '#f9f9f9',
                  border: entry.user_id === user?.id ? '2px solid #667eea' : 'none'
                }}
              >
                <div className="rank">{getRankEmoji(entry.rank)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '16px' }}>
                    {entry.display_name || entry.username}
                    {entry.user_id === user?.id && (
                      <span style={{ marginLeft: '8px', color: '#667eea', fontSize: '14px' }}>(You)</span>
                    )}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                    💧 Saved: {Math.round(entry.total_savings)} L
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#667eea' }}>
                    ⭐ {entry.total_points}
                  </div>
                  <div style={{ fontSize: '12px', color: '#999' }}>points</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Leaderboard;
