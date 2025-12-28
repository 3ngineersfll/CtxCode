import { Router } from 'express';
import { getDatabase } from '../database/init';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const db = await getDatabase();

    const achievements = await db.all('SELECT * FROM achievements ORDER BY points_value ASC');

    res.json({ achievements });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/my-achievements', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const db = await getDatabase();

    const userAchievements = await db.all(
      `SELECT ua.*, a.name, a.description, a.icon, a.points_value
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = ?
       ORDER BY ua.earned_at DESC`,
      req.user!.userId
    );

    res.json({ achievements: userAchievements });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
