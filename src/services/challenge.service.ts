import { Database } from 'sqlite';
import { v4 as uuidv4 } from 'uuid';
import { Challenge, UserChallenge } from '../types';
import { PointsService } from './points.service';

export class ChallengeService {
  private pointsService: PointsService;

  constructor(private db: Database) {
    this.pointsService = new PointsService(db);
  }

  async createChallenge(challenge: Omit<Challenge, 'id' | 'created_at'>): Promise<Challenge> {
    const id = uuidv4();

    await this.db.run(
      `INSERT INTO challenges
       (id, title, description, challenge_type, target_value, reward_points, start_date, end_date, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      challenge.title,
      challenge.description || null,
      challenge.challenge_type,
      challenge.target_value,
      challenge.reward_points,
      challenge.start_date,
      challenge.end_date,
      challenge.is_active ? 1 : 0
    );

    const created = await this.db.get('SELECT * FROM challenges WHERE id = ?', id);
    return created;
  }

  async getActiveChallenges(): Promise<Challenge[]> {
    return await this.db.all(
      `SELECT * FROM challenges
       WHERE is_active = 1
       AND start_date <= datetime('now')
       AND end_date >= datetime('now')
       ORDER BY end_date ASC`
    );
  }

  async joinChallenge(userId: string, challengeId: string): Promise<UserChallenge> {
    const challenge = await this.db.get('SELECT * FROM challenges WHERE id = ?', challengeId);

    if (!challenge) {
      throw new Error('Challenge not found');
    }

    if (!challenge.is_active) {
      throw new Error('Challenge is not active');
    }

    const existing = await this.db.get(
      'SELECT * FROM user_challenges WHERE user_id = ? AND challenge_id = ?',
      userId,
      challengeId
    );

    if (existing) {
      return existing;
    }

    const id = uuidv4();

    await this.db.run(
      `INSERT INTO user_challenges (id, user_id, challenge_id, progress, completed, points_awarded)
       VALUES (?, ?, ?, ?, ?, ?)`,
      id,
      userId,
      challengeId,
      0,
      0,
      0
    );

    const created = await this.db.get('SELECT * FROM user_challenges WHERE id = ?', id);
    return created;
  }

  async updateChallengeProgress(userId: string): Promise<string[]> {
    const activeChallenges = await this.db.all(
      `SELECT uc.*, c.challenge_type, c.target_value, c.reward_points
       FROM user_challenges uc
       JOIN challenges c ON uc.challenge_id = c.id
       WHERE uc.user_id = ?
       AND uc.completed = 0
       AND c.is_active = 1
       AND c.end_date >= datetime('now')`,
      userId
    );

    const completedIds: string[] = [];

    for (const userChallenge of activeChallenges) {
      const progress = await this.calculateProgress(userId, userChallenge);

      await this.db.run(
        'UPDATE user_challenges SET progress = ? WHERE id = ?',
        progress,
        userChallenge.id
      );

      if (progress >= userChallenge.target_value && !userChallenge.completed) {
        await this.db.run(
          `UPDATE user_challenges
           SET completed = 1, completed_at = datetime('now'), points_awarded = ?
           WHERE id = ?`,
          userChallenge.reward_points,
          userChallenge.id
        );

        await this.pointsService.awardPoints(
          userId,
          userChallenge.reward_points,
          `Challenge completed: ${userChallenge.challenge_type}`
        );

        completedIds.push(userChallenge.challenge_id);
      }
    }

    await this.pointsService.checkAchievements(userId);

    return completedIds;
  }

  private async calculateProgress(userId: string, userChallenge: any): Promise<number> {
    const challengeType = userChallenge.challenge_type;

    switch (challengeType) {
      case 'daily': {
        const today = new Date().toISOString().split('T')[0];
        const summary = await this.db.get(
          'SELECT savings FROM daily_usage_summary WHERE user_id = ? AND date = ?',
          userId,
          today
        );
        return summary?.savings || 0;
      }

      case 'weekly': {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split('T')[0];

        const summary = await this.db.get(
          'SELECT SUM(savings) as total FROM daily_usage_summary WHERE user_id = ? AND date >= ?',
          userId,
          weekAgoStr
        );
        return summary?.total || 0;
      }

      case 'monthly': {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        const monthAgoStr = monthAgo.toISOString().split('T')[0];

        const summary = await this.db.get(
          'SELECT SUM(savings) as total FROM daily_usage_summary WHERE user_id = ? AND date >= ?',
          userId,
          monthAgoStr
        );
        return summary?.total || 0;
      }

      default:
        return 0;
    }
  }

  async getUserChallenges(userId: string): Promise<any[]> {
    return await this.db.all(
      `SELECT uc.*, c.title, c.description, c.challenge_type, c.target_value, c.reward_points, c.end_date
       FROM user_challenges uc
       JOIN challenges c ON uc.challenge_id = c.id
       WHERE uc.user_id = ?
       ORDER BY c.end_date ASC`,
      userId
    );
  }
}
