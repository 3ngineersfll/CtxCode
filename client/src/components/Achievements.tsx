import { useState, useEffect } from 'react';
import { achievementAPI } from '../services/api';

function Achievements() {
  const [allAchievements, setAllAchievements] = useState<any[]>([]);
  const [userAchievements, setUserAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      const [allRes, userRes] = await Promise.all([
        achievementAPI.getAllAchievements(),
        achievementAPI.getUserAchievements()
      ]);

      setAllAchievements(allRes.data.achievements);
      setUserAchievements(userRes.data.achievements);
    } catch (error) {
      console.error('Failed to load achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const isEarned = (achievementId: string) => {
    return userAchievements.some(ua => ua.achievement_id === achievementId);
  };

  if (loading) {
    return <div className="loading">Loading achievements...</div>;
  }

  return (
    <div>
      <div className="card">
        <h2>Achievements</h2>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#667eea' }}>
            {userAchievements.length} / {allAchievements.length} Unlocked
          </div>
          <div className="progress-bar" style={{ marginTop: '12px' }}>
            <div
              className="progress-fill"
              style={{ width: `${(userAchievements.length / allAchievements.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="achievement-grid">
          {allAchievements.map((achievement) => {
            const earned = isEarned(achievement.id);
            return (
              <div
                key={achievement.id}
                className="achievement-card"
                style={{
                  background: earned ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f9f9f9',
                  color: earned ? 'white' : '#333',
                  opacity: earned ? 1 : 0.6
                }}
              >
                <div className="achievement-icon">{achievement.icon}</div>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>{achievement.name}</div>
                <div style={{ fontSize: '12px', marginBottom: '8px', opacity: 0.9 }}>
                  {achievement.description}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>
                  ⭐ {achievement.points_value} pts
                </div>
                {earned && (
                  <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.9 }}>
                    Earned: {new Date(userAchievements.find(ua => ua.achievement_id === achievement.id)?.earned_at || '').toLocaleDateString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {userAchievements.length > 0 && (
        <div className="card">
          <h2>Recent Achievements</h2>
          {userAchievements
            .sort((a, b) => new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime())
            .slice(0, 5)
            .map((ua) => {
              const achievement = allAchievements.find(a => a.id === ua.achievement_id);
              if (!achievement) return null;

              return (
                <div key={ua.id} style={{ padding: '16px', background: '#f9f9f9', borderRadius: '8px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '48px' }}>{achievement.icon}</div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ marginBottom: '4px' }}>{achievement.name}</h3>
                      <p style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>{achievement.description}</p>
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        Earned on {new Date(ua.earned_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: '#667eea' }}>
                        ⭐ {achievement.points_value}
                      </div>
                      <div style={{ fontSize: '12px', color: '#999' }}>points</div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

export default Achievements;
