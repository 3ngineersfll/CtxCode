import { useState, useEffect } from 'react';
import { rewardAPI, authAPI } from '../services/api';

interface RewardsProps {
  user: any;
}

function Rewards({ user: initialUser }: RewardsProps) {
  const [rewards, setRewards] = useState<any[]>([]);
  const [userRewards, setUserRewards] = useState<any[]>([]);
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadRewards();
  }, []);

  const loadRewards = async () => {
    try {
      const [rewardsRes, userRewardsRes, userRes] = await Promise.all([
        rewardAPI.getRewards(),
        rewardAPI.getUserRewards(),
        authAPI.getCurrentUser()
      ]);

      setRewards(rewardsRes.data.rewards);
      setUserRewards(userRewardsRes.data.rewards);
      setUser(userRes.data.user);
    } catch (error) {
      console.error('Failed to load rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (rewardId: string, pointsCost: number) => {
    if (user.total_points < pointsCost) {
      setMessage('Insufficient points!');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      await rewardAPI.redeemReward(rewardId);
      setMessage('Reward redeemed successfully!');
      await loadRewards();
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Failed to redeem reward');
    }
  };

  const getRewardTypeIcon = (type: string) => {
    const icons: any = {
      voucher: '🎫',
      donation: '🌳',
      physical: '📦',
      digital: '💎'
    };
    return icons[type] || '🎁';
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      pending: '#f39c12',
      approved: '#3498db',
      shipped: '#9b59b6',
      completed: '#27ae60',
      cancelled: '#e74c3c'
    };
    return colors[status] || '#999';
  };

  if (loading) {
    return <div className="loading">Loading rewards...</div>;
  }

  return (
    <div>
      {message && (
        <div className={message.includes('Failed') || message.includes('Insufficient') ? 'error' : 'success'} style={{ marginBottom: '16px' }}>
          {message}
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2>Available Rewards</h2>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', color: '#999', marginBottom: '4px' }}>Your Points</div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#667eea' }}>⭐ {user.total_points}</div>
          </div>
        </div>

        {rewards.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            No rewards available at the moment.
          </p>
        ) : (
          <div>
            {rewards.map((reward) => (
              <div key={reward.id} className="reward-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                  <div style={{ fontSize: '48px' }}>{getRewardTypeIcon(reward.reward_type)}</div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ marginBottom: '4px' }}>{reward.name}</h3>
                    <p style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>{reward.description}</p>
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      {reward.stock_available > 0 && `${reward.stock_available} available`}
                      {reward.stock_available === -1 && 'Unlimited stock'}
                      {reward.stock_available === 0 && '❌ Out of stock'}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#667eea', marginBottom: '8px' }}>
                    ⭐ {reward.points_cost}
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleRedeem(reward.id, reward.points_cost)}
                    disabled={user.total_points < reward.points_cost || reward.stock_available === 0}
                    style={{
                      padding: '8px 16px',
                      opacity: user.total_points < reward.points_cost || reward.stock_available === 0 ? 0.5 : 1,
                      cursor: user.total_points < reward.points_cost || reward.stock_available === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Redeem
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {userRewards.length > 0 && (
        <div className="card">
          <h2>My Redeemed Rewards</h2>
          {userRewards.map((userReward) => (
            <div key={userReward.id} style={{ padding: '16px', background: '#f9f9f9', borderRadius: '8px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '32px' }}>{getRewardTypeIcon(userReward.reward_type)}</span>
                    <div>
                      <h3 style={{ marginBottom: '4px' }}>{userReward.name}</h3>
                      <p style={{ color: '#666', fontSize: '14px' }}>{userReward.description}</p>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    Redeemed on {new Date(userReward.redeemed_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
                    ⭐ {userReward.points_spent} pts
                  </div>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'white',
                      background: getStatusColor(userReward.status)
                    }}
                  >
                    {userReward.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Rewards;
