import { Router } from 'express';
import { LeaderboardService } from '../services/leaderboard.service';
import { getDatabase } from '../database/init';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { period = 'all-time', limit = 50 } = req.query;

    const validPeriods = ['daily', 'weekly', 'monthly', 'all-time'];
    if (!validPeriods.includes(period as string)) {
      return res.status(400).json({ error: 'Invalid period' });
    }

    const db = await getDatabase();
    const leaderboardService = new LeaderboardService(db);

    const leaderboard = await leaderboardService.getLeaderboard(
      period as 'daily' | 'weekly' | 'monthly' | 'all-time',
      parseInt(limit as string)
    );

    res.json({ leaderboard, period });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/my-rank', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { period = 'all-time' } = req.query;

    const validPeriods = ['daily', 'weekly', 'monthly', 'all-time'];
    if (!validPeriods.includes(period as string)) {
      return res.status(400).json({ error: 'Invalid period' });
    }

    const db = await getDatabase();
    const leaderboardService = new LeaderboardService(db);

    const rank = await leaderboardService.getUserRank(
      req.user!.userId,
      period as 'daily' | 'weekly' | 'monthly' | 'all-time'
    );

    res.json({ rank, period });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/update', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { period = 'all-time' } = req.body;

    const validPeriods = ['daily', 'weekly', 'monthly', 'all-time'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({ error: 'Invalid period' });
    }

    const db = await getDatabase();
    const leaderboardService = new LeaderboardService(db);

    await leaderboardService.updateLeaderboard(period);

    res.json({ message: 'Leaderboard updated successfully', period });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
