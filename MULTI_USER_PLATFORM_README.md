# 🌊 Water Monitor - Multi-User Conservation Platform

Transform water conservation into a competitive, gamified experience! This enhanced platform allows users to register accounts, compete on leaderboards, earn badges, and track their conservation impact against friends and the community.

## 🆕 New Features

### 🏆 Gamification & Competition
- **User Accounts**: Secure registration and authentication system
- **Global Leaderboard**: See how you rank against other water conservationists
- **Badge System**: Earn 10+ unique badges for conservation milestones
- **Conservation Score**: Dynamic scoring based on usage, streaks, and achievements
- **Streak Tracking**: Build daily streaks to climb the rankings
- **Weekly Challenges**: Compete for top spots in weekly conservation rankings

### 📊 Enhanced Tracking
- **Cloud Sync**: All your data backed up to the cloud
- **Multi-Device**: Access your account from any device
- **Social Profiles**: Display name, avatar, and public stats
- **Historical Analytics**: Track your improvement over time

## 🏗️ Architecture

```
┌─────────────────┐
│  Android App    │
│  (Frontend)     │
└────────┬────────┘
         │
         │ REST API (HTTPS)
         │
┌────────▼────────┐
│  Node.js Server │
│  (Backend API)  │
└────────┬────────┘
         │
         │
┌────────▼────────┐
│  MongoDB        │
│  (Database)     │
└─────────────────┘
```

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 16+ and npm
- MongoDB 5.0+
- Android Studio (for app development)
- Android device with API 23+

### Backend Setup

1. **Install MongoDB**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install mongodb

   # macOS with Homebrew
   brew install mongodb-community

   # Start MongoDB
   mongod --dbpath /path/to/data
   ```

2. **Configure Backend**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Install Dependencies & Start Server**
   ```bash
   npm install
   npm start
   # Server runs on http://localhost:3000
   ```

4. **Initialize Badges**
   ```bash
   # Make a POST request to initialize default badges
   curl -X POST http://localhost:3000/api/badges/init
   ```

### Android App Setup

1. **Update API URL**
   Edit `android_app/app/src/main/java/com/watermonitor/api/ApiClient.java`:
   ```java
   // For emulator
   private static final String BASE_URL = "http://10.0.2.2:3000/api/";

   // For real device (use your computer's IP)
   private static final String BASE_URL = "http://192.168.1.XXX:3000/api/";
   ```

2. **Build & Install**
   - Open `android_app` in Android Studio
   - Sync Gradle
   - Run on device/emulator

## 📱 App Workflow

### First Time User
1. **Launch App** → Login Screen
2. **Tap "Register"** → Create Account
   - Choose username
   - Enter email & password
   - Set display name
3. **Auto-Login** → Main Dashboard
4. **Connect Arduino** via Bluetooth
5. **Start Monitoring** water usage
6. **Earn Badges** automatically
7. **Compete** on leaderboards

### Returning User
1. **Launch App** → Auto-login
2. **View Dashboard** with stats
3. **Check Leaderboard** for rank
4. **See New Badges** earned
5. **Continue Tracking** usage

## 🏅 Badge System

### Available Badges

| Badge | Icon | Requirement | Points | Rarity |
|-------|------|-------------|--------|--------|
| Early Adopter | 🎯 | Register account | 25 | Common |
| First Drop | 💧 | Record first usage | 50 | Common |
| Water Warrior | 🛡️ | Save 100L | 100 | Common |
| Eco Champion | 🏆 | Save 500L | 250 | Rare |
| Water Master | 👑 | Save 1000L | 500 | Epic |
| Conservation Legend | 💎 | Save 5000L | 1000 | Legendary |
| 7-Day Streak | 🔥 | 7 consecutive days | 150 | Rare |
| 30-Day Streak | ⭐ | 30 consecutive days | 500 | Epic |
| Efficient User | ⚡ | Avg < 50L/day for a week | 200 | Rare |
| Community Leader | 🌟 | Rank in top 10 | 300 | Epic |

### How Badges Work
- **Automatic**: Badges are checked and awarded automatically
- **Push Notifications**: Get notified when you earn a badge (future feature)
- **Profile Display**: Show off your badges on your profile
- **Points**: Each badge adds to your conservation score

## 📊 Conservation Score Calculation

```
Conservation Score = Base Score + Streak Bonus + Badge Bonus

Where:
- Base Score = max(0, 1000 - daily_average)
- Streak Bonus = current_streak × 10
- Badge Bonus = badge_count × 50
```

**Example**:
- User with 30L/day average: Base = 970
- 7-day streak: Bonus = 70
- 5 badges earned: Bonus = 250
- **Total Score = 1290 points**

## 🔌 API Endpoints

### Authentication
```
POST /api/auth/register - Create new account
POST /api/auth/login - Login user
GET /api/auth/me - Get current user
```

### Water Usage
```
POST /api/usage - Submit usage data
GET /api/usage/history?days=30 - Get usage history
GET /api/usage/summary/daily?days=7 - Get daily summary
```

### Leaderboard
```
GET /api/leaderboard?limit=100&category=conservation - Global leaderboard
GET /api/leaderboard/rank/:userId - Get user's rank
GET /api/leaderboard/weekly?limit=10 - Weekly top performers
```

### Badges
```
GET /api/badges - Get all available badges
GET /api/badges/user/:userId - Get user's badges
POST /api/badges/check - Check and award new badges
POST /api/badges/init - Initialize default badges (admin)
```

## 🔐 Security Features

- **Password Hashing**: BCrypt with salt
- **JWT Tokens**: Secure authentication
- **Rate Limiting**: Prevent API abuse
- **Input Validation**: Sanitize all inputs
- **CORS Protection**: Configured origins
- **HTTPS Ready**: SSL/TLS support

## 📈 Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  username: String (unique),
  email: String (unique),
  password: String (hashed),
  displayName: String,
  avatar: String,
  totalWaterSaved: Number,
  currentStreak: Number,
  longestStreak: Number,
  badges: [{ badgeId, earnedAt }],
  stats: {
    totalUsage,
    dailyAverage,
    weeklyAverage,
    conservationScore
  },
  createdAt: Date
}
```

### UsageData Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  timestamp: Date,
  flowRate: Number,
  totalVolume: Number,
  date: String (YYYY-MM-DD),
  createdAt: Date
}
```

### Badges Collection
```javascript
{
  _id: ObjectId,
  badgeId: String (unique),
  name: String,
  description: String,
  icon: String (emoji),
  category: String,
  requirement: String,
  points: Number,
  rarity: String
}
```

## 🎮 Competition Mechanics

### Leaderboard Categories

1. **Conservation Score** (Default)
   - Overall ranking
   - Factors: usage, streaks, badges

2. **Streak Leaders**
   - Longest current streaks
   - Most consistent users

3. **Badge Collectors**
   - Most badges earned
   - Rarest badge holders

4. **Weekly Champions**
   - Best performers this week
   - Resets every Monday

### Ranking Algorithm
```
Rank = Position in descending order by conservation score
Ties broken by:
  1. Longest streak
  2. Badge count
  3. Registration date (earlier = higher)
```

## 🌐 Deployment

### Backend Deployment (Example: Heroku)

```bash
# Install Heroku CLI
heroku create water-monitor-api

# Add MongoDB addon
heroku addons:create mongolab:sandbox

# Set environment variables
heroku config:set JWT_SECRET=your_secret_key
heroku config:set NODE_ENV=production

# Deploy
git push heroku main

# Initialize badges
heroku run curl -X POST https://your-app.herokuapp.com/api/badges/init
```

### Android App Deployment

1. **Update BASE_URL** to production server
2. **Generate signed APK**:
   - Build → Generate Signed Bundle/APK
   - Create keystore
   - Build release APK

3. **Distribute**:
   - Google Play Store
   - Direct APK distribution
   - Firebase App Distribution

## 🔧 Configuration

### Server Configuration (.env)
```bash
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://user:pass@host:port/database
JWT_SECRET=your_very_secure_random_string
JWT_EXPIRE=7d
ALLOWED_ORIGINS=https://yourapp.com
```

### App Configuration (ApiClient.java)
```java
private static final String BASE_URL = "https://your-api.com/api/";
```

## 🐛 Troubleshooting

### Backend Issues

**MongoDB Connection Failed**
```bash
# Check MongoDB is running
sudo systemctl status mongodb

# Restart MongoDB
sudo systemctl restart mongodb
```

**Port Already in Use**
```bash
# Change PORT in .env or kill process
lsof -i :3000
kill -9 <PID>
```

### App Issues

**Can't Connect to Server**
- Check BASE_URL is correct
- Ensure server is running
- Verify network connectivity
- Check firewall settings

**Login/Register Fails**
- Check server logs
- Verify MongoDB is running
- Test API with Postman
- Check network permissions in manifest

## 📊 Analytics & Insights

### User Engagement Metrics
- Daily Active Users (DAU)
- Weekly Active Users (WAU)
- Average session duration
- Badge earn rate
- Leaderboard interaction rate

### Conservation Metrics
- Total water saved (community)
- Average daily usage
- Improvement over time
- Top performing regions

## 🚀 Future Enhancements

- [ ] Real-time notifications for badges
- [ ] Friend system and private challenges
- [ ] Team competitions
- [ ] Water-saving tips AI recommendations
- [ ] Integration with smart home systems
- [ ] Monthly conservation reports
- [ ] Carbon footprint calculator
- [ ] Community forums
- [ ] Achievement sharing on social media
- [ ] Geo-based leaderboards

## 🤝 Contributing

Contributions welcome! Areas for improvement:
- Additional badge types
- New competition formats
- UI/UX enhancements
- Performance optimizations
- Localization

## 📄 License

Open source - MIT License

## 💡 Tips for Success

### For Users
1. **Consistency is Key**: Daily usage tracking builds streaks
2. **Set Goals**: Aim to reduce usage by 10% each week
3. **Compete Friendly**: Use leaderboards as motivation
4. **Share Tips**: Help community improve together

### For Developers
1. **Monitor API Usage**: Implement analytics
2. **Regular Backups**: Automate MongoDB backups
3. **Update Dependencies**: Keep packages current
4. **Security Audits**: Regular vulnerability scans
5. **User Feedback**: Collect and act on user suggestions

---

**Join the water conservation revolution! 💧🌍**

*Every drop counts. Every user matters. Together we save water.*
