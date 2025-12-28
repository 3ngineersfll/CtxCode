-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    total_points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Water usage records
CREATE TABLE IF NOT EXISTS water_usage (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL,
    unit TEXT DEFAULT 'liters',
    device_id TEXT,
    activity_type TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    points_earned INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Daily usage summary for faster queries
CREATE TABLE IF NOT EXISTS daily_usage_summary (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date DATE NOT NULL,
    total_usage REAL DEFAULT 0,
    average_baseline REAL,
    savings REAL DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, date)
);

-- Challenges
CREATE TABLE IF NOT EXISTS challenges (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    challenge_type TEXT NOT NULL,
    target_value REAL NOT NULL,
    reward_points INTEGER NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User challenge participation
CREATE TABLE IF NOT EXISTS user_challenges (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    challenge_id TEXT NOT NULL,
    progress REAL DEFAULT 0,
    completed BOOLEAN DEFAULT 0,
    completed_at DATETIME,
    points_awarded INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
    UNIQUE(user_id, challenge_id)
);

-- Achievements/Badges
CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    points_value INTEGER DEFAULT 0,
    requirement_type TEXT NOT NULL,
    requirement_value REAL NOT NULL
);

-- User achievements
CREATE TABLE IF NOT EXISTS user_achievements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    UNIQUE(user_id, achievement_id)
);

-- Leaderboard (materialized view updated periodically)
CREATE TABLE IF NOT EXISTS leaderboard (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT,
    total_points INTEGER DEFAULT 0,
    total_savings REAL DEFAULT 0,
    rank INTEGER,
    period TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Rewards redemption
CREATE TABLE IF NOT EXISTS rewards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    points_cost INTEGER NOT NULL,
    reward_type TEXT NOT NULL,
    stock_available INTEGER DEFAULT -1,
    is_active BOOLEAN DEFAULT 1,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User reward redemptions
CREATE TABLE IF NOT EXISTS user_rewards (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    reward_id TEXT NOT NULL,
    points_spent INTEGER NOT NULL,
    redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_water_usage_user_timestamp ON water_usage(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_daily_summary_user_date ON daily_usage_summary(user_id, date);
CREATE INDEX IF NOT EXISTS idx_leaderboard_period ON leaderboard(period, rank);
CREATE INDEX IF NOT EXISTS idx_challenges_active ON challenges(is_active, end_date);
CREATE INDEX IF NOT EXISTS idx_user_challenges_user ON user_challenges(user_id, completed);
