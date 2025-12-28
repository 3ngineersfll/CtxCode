export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  display_name?: string;
  avatar_url?: string;
  total_points: number;
  level: number;
  created_at: string;
  updated_at: string;
}

export interface WaterUsage {
  id: string;
  user_id: string;
  amount: number;
  unit: string;
  device_id?: string;
  activity_type?: string;
  timestamp: string;
  points_earned: number;
}

export interface DailyUsageSummary {
  id: string;
  user_id: string;
  date: string;
  total_usage: number;
  average_baseline?: number;
  savings: number;
  points_earned: number;
}

export interface Challenge {
  id: string;
  title: string;
  description?: string;
  challenge_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  target_value: number;
  reward_points: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export interface UserChallenge {
  id: string;
  user_id: string;
  challenge_id: string;
  progress: number;
  completed: boolean;
  completed_at?: string;
  points_awarded: number;
}

export interface Achievement {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  points_value: number;
  requirement_type: string;
  requirement_value: number;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
}

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  username: string;
  display_name?: string;
  total_points: number;
  total_savings: number;
  rank: number;
  period: 'daily' | 'weekly' | 'monthly' | 'all-time';
  period_start: string;
  period_end: string;
  updated_at: string;
}

export interface Reward {
  id: string;
  name: string;
  description?: string;
  points_cost: number;
  reward_type: 'voucher' | 'donation' | 'physical' | 'digital';
  stock_available: number;
  is_active: boolean;
  image_url?: string;
  created_at: string;
}

export interface UserReward {
  id: string;
  user_id: string;
  reward_id: string;
  points_spent: number;
  redeemed_at: string;
  status: 'pending' | 'approved' | 'shipped' | 'completed' | 'cancelled';
}

export interface WaterMeasurement {
  amount: number;
  unit?: string;
  device_id?: string;
  activity_type?: string;
  timestamp?: string;
}

export interface UserStats {
  user_id: string;
  username: string;
  total_points: number;
  level: number;
  total_usage: number;
  total_savings: number;
  achievements_earned: number;
  challenges_completed: number;
  current_rank: number;
}
