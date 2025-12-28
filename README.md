# Water Conservation Game

A competitive gamification platform for smart water measurement systems that rewards users for conserving water.

## Features

- **Smart Water Tracking**: Record and monitor water usage across different activities
- **Gamification**: Earn points, level up, and unlock achievements
- **Competitive Leaderboards**: Compete with others on daily, weekly, monthly, and all-time rankings
- **Challenges**: Join conservation challenges to earn bonus rewards
- **Rewards System**: Redeem points for eco-friendly rewards and vouchers
- **Real-time Updates**: WebSocket support for live leaderboard updates
- **Beautiful Dashboard**: Visualize your water usage trends and savings

## Tech Stack

### Backend
- Node.js + Express + TypeScript
- SQLite database
- WebSocket server for real-time updates
- JWT authentication
- bcrypt password hashing

### Frontend
- React 18 + TypeScript
- Vite build tool
- Recharts for data visualization
- React Router for navigation
- Axios for API calls

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CtxCode
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and configure:
   - `JWT_SECRET`: Change to a secure random string
   - `PORT`: Backend server port (default: 3000)
   - `DB_PATH`: Database file path

5. **Run the application**

   Development mode (runs both backend and frontend):
   ```bash
   npm run dev
   ```

   Or run separately:
   ```bash
   # Backend
   npm run server:dev

   # Frontend (in another terminal)
   npm run client:dev
   ```

6. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - WebSocket: ws://localhost:3000/ws

## Project Structure

```
CtxCode/
├── src/                      # Backend source code
│   ├── database/            # Database schema and initialization
│   ├── middleware/          # Express middleware (auth)
│   ├── routes/              # API route handlers
│   ├── services/            # Business logic services
│   ├── types/               # TypeScript type definitions
│   └── server.ts            # Main server file
├── client/                  # Frontend React application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API service layer
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # Entry point
│   ├── index.html
│   └── vite.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Documentation

- **[GAME_FEATURES.md](GAME_FEATURES.md)**: Complete guide to game mechanics, achievements, challenges, and strategies
- **API Reference**: See below

## Gamification System

### Points System

Users earn points by:
- Recording water usage
- Saving water compared to their baseline
- Completing challenges
- Earning achievements
- Leveling up

**Savings Multipliers:**
- 20-30% savings: 1.5x points
- 30-50% savings: 2x points
- 50%+ savings: 3x points

### Levels

Level = floor(sqrt(total_points / 100)) + 1

Each level up awards bonus points: Level × 100

## API Reference

See the full API documentation in the sections below or try the interactive endpoints.

### Quick API Examples

**Register a new user:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"johndoe","email":"john@example.com","password":"securepass"}'
```

**Record water usage:**
```bash
curl -X POST http://localhost:3000/api/water/usage \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":50.5,"activity_type":"shower"}'
```

**Get leaderboard:**
```bash
curl http://localhost:3000/api/leaderboard?period=all-time \
  -H "Authorization: Bearer YOUR_TOKEN"
```

For complete API documentation, see the API endpoints section in the code or use the interactive frontend.

## Development

**Build for production:**
```bash
npm run build
```

**Run production server:**
```bash
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License

## Support

For issues and questions, please open an issue on GitHub.

---

Start conserving water and climb the leaderboard today!
