import { useState, useEffect } from 'react';
import { challengeAPI } from '../services/api';

function Challenges() {
  const [activeChallenges, setActiveChallenges] = useState<any[]>([]);
  const [userChallenges, setUserChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    try {
      const [activeRes, userRes] = await Promise.all([
        challengeAPI.getActiveChallenges(),
        challengeAPI.getUserChallenges()
      ]);

      setActiveChallenges(activeRes.data.challenges);
      setUserChallenges(userRes.data.challenges);
    } catch (error) {
      console.error('Failed to load challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinChallenge = async (challengeId: string) => {
    try {
      await challengeAPI.joinChallenge(challengeId);
      setMessage('Challenge joined successfully!');
      await loadChallenges();
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Failed to join challenge');
    }
  };

  const getChallengeTypeLabel = (type: string) => {
    const labels: any = {
      daily: '📅 Daily',
      weekly: '📆 Weekly',
      monthly: '🗓️ Monthly'
    };
    return labels[type] || type;
  };

  const getProgressPercentage = (progress: number, target: number) => {
    return Math.min((progress / target) * 100, 100);
  };

  if (loading) {
    return <div className="loading">Loading challenges...</div>;
  }

  return (
    <div>
      {message && (
        <div className={message.includes('Failed') ? 'error' : 'success'} style={{ marginBottom: '16px' }}>
          {message}
        </div>
      )}

      <div className="card">
        <h2>My Active Challenges</h2>
        {userChallenges.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            You haven't joined any challenges yet. Join one below to start earning rewards!
          </p>
        ) : (
          <div>
            {userChallenges.map((challenge) => (
              <div key={challenge.id} className="challenge-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h3 style={{ margin: 0 }}>{challenge.title}</h3>
                      {challenge.completed && (
                        <span style={{ background: '#27ae60', color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                          ✓ Completed
                        </span>
                      )}
                    </div>
                    <p style={{ color: '#666', margin: '4px 0' }}>{challenge.description}</p>
                    <div style={{ fontSize: '14px', color: '#999', marginTop: '8px' }}>
                      {getChallengeTypeLabel(challenge.challenge_type)} | Ends: {new Date(challenge.end_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#667eea' }}>⭐ {challenge.reward_points}</div>
                    <div style={{ fontSize: '12px', color: '#999' }}>points</div>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                    <span>Progress</span>
                    <span style={{ fontWeight: 600 }}>
                      {Math.round(challenge.progress)} / {challenge.target_value} L
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${getProgressPercentage(challenge.progress, challenge.target_value)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Available Challenges</h2>
        {activeChallenges.filter(c => !userChallenges.find(uc => uc.challenge_id === c.id)).length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            No new challenges available at the moment. Check back later!
          </p>
        ) : (
          <div>
            {activeChallenges
              .filter(c => !userChallenges.find(uc => uc.challenge_id === c.id))
              .map((challenge) => (
                <div key={challenge.id} className="challenge-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ marginBottom: '8px' }}>{challenge.title}</h3>
                      <p style={{ color: '#666', marginBottom: '12px' }}>{challenge.description}</p>
                      <div style={{ fontSize: '14px', color: '#999' }}>
                        {getChallengeTypeLabel(challenge.challenge_type)} | Save {challenge.target_value}L |
                        Ends: {new Date(challenge.end_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: '#667eea', marginBottom: '8px' }}>
                        ⭐ {challenge.reward_points}
                      </div>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleJoinChallenge(challenge.id)}
                        style={{ padding: '8px 16px' }}
                      >
                        Join Challenge
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Challenges;
