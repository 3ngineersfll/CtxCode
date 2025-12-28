import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { initDatabase } from './database/init';
import { LeaderboardService } from './services/leaderboard.service';

import authRoutes from './routes/auth.routes';
import waterRoutes from './routes/water.routes';
import challengesRoutes from './routes/challenges.routes';
import leaderboardRoutes from './routes/leaderboard.routes';
import achievementsRoutes from './routes/achievements.routes';
import rewardsRoutes from './routes/rewards.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/water', waterRoutes);
app.use('/api/challenges', challengesRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/rewards', rewardsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const server = createServer(app);

const wss = new WebSocketServer({ server, path: '/ws' });

const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  clients.add(ws);

  ws.on('message', (message) => {
    console.log('Received:', message.toString());
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    clients.delete(ws);
  });

  ws.send(JSON.stringify({ type: 'connected', message: 'Welcome to Water Conservation Game!' }));
});

export function broadcastLeaderboardUpdate(period: string) {
  const message = JSON.stringify({
    type: 'leaderboard_update',
    period,
    timestamp: new Date().toISOString()
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export function broadcastAchievementEarned(userId: string, achievementId: string) {
  const message = JSON.stringify({
    type: 'achievement_earned',
    userId,
    achievementId,
    timestamp: new Date().toISOString()
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

async function startServer() {
  try {
    await initDatabase(process.env.DB_PATH || './water-conservation.db');
    console.log('✅ Database initialized');

    const db = await import('./database/init').then(m => m.getDatabase());
    const leaderboardService = new LeaderboardService(await db);

    await leaderboardService.updateLeaderboard('all-time');
    await leaderboardService.updateLeaderboard('daily');
    await leaderboardService.updateLeaderboard('weekly');
    await leaderboardService.updateLeaderboard('monthly');
    console.log('✅ Leaderboards initialized');

    setInterval(async () => {
      const db = await import('./database/init').then(m => m.getDatabase());
      const leaderboardService = new LeaderboardService(await db);

      await leaderboardService.updateLeaderboard('all-time');
      await leaderboardService.updateLeaderboard('daily');
      await leaderboardService.updateLeaderboard('weekly');
      await leaderboardService.updateLeaderboard('monthly');

      broadcastLeaderboardUpdate('all');
      console.log('🔄 Leaderboards updated');
    }, 5 * 60 * 1000);

    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔌 WebSocket server running on ws://localhost:${PORT}/ws`);
      console.log(`💧 Water Conservation Game API is ready!`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
