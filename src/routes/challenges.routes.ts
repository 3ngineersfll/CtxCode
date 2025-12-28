import { Router } from 'express';
import { ChallengeService } from '../services/challenge.service';
import { getDatabase } from '../database/init';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const db = await getDatabase();
    const challengeService = new ChallengeService(db);

    const challenges = await challengeService.getActiveChallenges();

    res.json({ challenges });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:challengeId/join', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { challengeId } = req.params;

    const db = await getDatabase();
    const challengeService = new ChallengeService(db);

    const userChallenge = await challengeService.joinChallenge(req.user!.userId, challengeId);

    res.status(201).json({ userChallenge });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/my-challenges', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const db = await getDatabase();
    const challengeService = new ChallengeService(db);

    const challenges = await challengeService.getUserChallenges(req.user!.userId);

    res.json({ challenges });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/create', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { title, description, challenge_type, target_value, reward_points, start_date, end_date } = req.body;

    if (!title || !challenge_type || !target_value || !reward_points || !start_date || !end_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = await getDatabase();
    const challengeService = new ChallengeService(db);

    const challenge = await challengeService.createChallenge({
      title,
      description,
      challenge_type,
      target_value,
      reward_points,
      start_date,
      end_date,
      is_active: true
    });

    res.status(201).json({ challenge });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
