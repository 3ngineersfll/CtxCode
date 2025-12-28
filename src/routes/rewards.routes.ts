import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/init';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const db = await getDatabase();

    const rewards = await db.all(
      'SELECT * FROM rewards WHERE is_active = 1 ORDER BY points_cost ASC'
    );

    res.json({ rewards });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:rewardId/redeem', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { rewardId } = req.params;

    const db = await getDatabase();

    const reward = await db.get('SELECT * FROM rewards WHERE id = ? AND is_active = 1', rewardId);

    if (!reward) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    const user = await db.get('SELECT total_points FROM users WHERE id = ?', req.user!.userId);

    if (user.total_points < reward.points_cost) {
      return res.status(400).json({ error: 'Insufficient points' });
    }

    if (reward.stock_available === 0) {
      return res.status(400).json({ error: 'Reward out of stock' });
    }

    await db.run('BEGIN TRANSACTION');

    try {
      await db.run(
        'UPDATE users SET total_points = total_points - ? WHERE id = ?',
        reward.points_cost,
        req.user!.userId
      );

      if (reward.stock_available > 0) {
        await db.run(
          'UPDATE rewards SET stock_available = stock_available - 1 WHERE id = ?',
          rewardId
        );
      }

      const userRewardId = uuidv4();
      await db.run(
        `INSERT INTO user_rewards (id, user_id, reward_id, points_spent, status)
         VALUES (?, ?, ?, ?, ?)`,
        userRewardId,
        req.user!.userId,
        rewardId,
        reward.points_cost,
        'pending'
      );

      await db.run('COMMIT');

      const userReward = await db.get('SELECT * FROM user_rewards WHERE id = ?', userRewardId);

      res.status(201).json({
        message: 'Reward redeemed successfully',
        userReward
      });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/my-rewards', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const db = await getDatabase();

    const userRewards = await db.all(
      `SELECT ur.*, r.name, r.description, r.reward_type
       FROM user_rewards ur
       JOIN rewards r ON ur.reward_id = r.id
       WHERE ur.user_id = ?
       ORDER BY ur.redeemed_at DESC`,
      req.user!.userId
    );

    res.json({ rewards: userRewards });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
