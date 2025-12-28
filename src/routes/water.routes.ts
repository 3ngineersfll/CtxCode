import { Router } from 'express';
import { WaterService } from '../services/water.service';
import { ChallengeService } from '../services/challenge.service';
import { getDatabase } from '../database/init';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.post('/usage', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { amount, unit, device_id, activity_type } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const db = await getDatabase();
    const waterService = new WaterService(db);
    const challengeService = new ChallengeService(db);

    const usage = await waterService.recordUsage(req.user!.userId, {
      amount,
      unit,
      device_id,
      activity_type
    });

    const completedChallenges = await challengeService.updateChallengeProgress(req.user!.userId);

    res.status(201).json({
      usage,
      completedChallenges
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/usage/history', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, limit } = req.query;

    const db = await getDatabase();
    const waterService = new WaterService(db);

    const history = await waterService.getUserUsageHistory(
      req.user!.userId,
      startDate as string,
      endDate as string,
      limit ? parseInt(limit as string) : 100
    );

    res.json({ history });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/usage/summary', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { days } = req.query;

    const db = await getDatabase();
    const waterService = new WaterService(db);

    const summary = await waterService.getDailySummary(
      req.user!.userId,
      days ? parseInt(days as string) : 30
    );

    res.json({ summary });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const db = await getDatabase();
    const waterService = new WaterService(db);

    const stats = await waterService.getUserStats(req.user!.userId);

    res.json({ stats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
