import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (username: string, email: string, password: string, displayName?: string) =>
    api.post('/auth/register', { username, email, password, displayName }),

  login: (usernameOrEmail: string, password: string) =>
    api.post('/auth/login', { usernameOrEmail, password }),

  getCurrentUser: () => api.get('/auth/me')
};

export const waterAPI = {
  recordUsage: (amount: number, unit?: string, device_id?: string, activity_type?: string) =>
    api.post('/water/usage', { amount, unit, device_id, activity_type }),

  getUsageHistory: (startDate?: string, endDate?: string, limit?: number) =>
    api.get('/water/usage/history', { params: { startDate, endDate, limit } }),

  getDailySummary: (days?: number) =>
    api.get('/water/usage/summary', { params: { days } }),

  getStats: () => api.get('/water/stats')
};

export const challengeAPI = {
  getActiveChallenges: () => api.get('/challenges'),

  joinChallenge: (challengeId: string) => api.post(`/challenges/${challengeId}/join`),

  getUserChallenges: () => api.get('/challenges/my-challenges'),

  createChallenge: (challenge: any) => api.post('/challenges/create', challenge)
};

export const leaderboardAPI = {
  getLeaderboard: (period: string = 'all-time', limit: number = 50) =>
    api.get('/leaderboard', { params: { period, limit } }),

  getUserRank: (period: string = 'all-time') =>
    api.get('/leaderboard/my-rank', { params: { period } }),

  updateLeaderboard: (period: string) => api.post('/leaderboard/update', { period })
};

export const achievementAPI = {
  getAllAchievements: () => api.get('/achievements'),

  getUserAchievements: () => api.get('/achievements/my-achievements')
};

export const rewardAPI = {
  getRewards: () => api.get('/rewards'),

  redeemReward: (rewardId: string) => api.post(`/rewards/${rewardId}/redeem`),

  getUserRewards: () => api.get('/rewards/my-rewards')
};

export default api;
