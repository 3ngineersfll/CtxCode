import { Database } from 'sqlite';
import { v4 as uuidv4 } from 'uuid';

export class PointsService {
  constructor(private db: Database) {}

  async calculateWaterSavingsPoints(
    userId: string,
    currentUsage: number,
    date: string
  ): Promise<number> {
    // Get user's average baseline (last 30 days, excluding today)
    const baseline = await this.db.get(
      `SELECT AVG(total_usage) as avg_usage
       FROM daily_usage_summary
       WHERE user_id = ?
       AND date < ?
       AND date >= date(?, '-30 days')`,
      userId,
      date,
      date
    );

    const averageBaseline = baseline?.avg_usage || currentUsage;

    if (currentUsage >= averageBaseline) {
      return 0;
    }

    const savings = averageBaseline - currentUsage;
    const savingsPercentage = (savings / averageBaseline) * 100;

    let points = Math.floor(savings * 10);

    if (savingsPercentage >= 50) {
      points *= 3;
    } else if (savingsPercentage >= 30) {
      points *= 2;
    } else if (savingsPercentage >= 20) {
      points *= 1.5;
    }

    return Math.floor(points);
  }

  async awardPoints(userId: string, points: number, reason?: string): Promise<void> {
    await this.db.run(
      'UPDATE users SET total_points = total_points + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      points,
      userId
    );

    await this.checkAndUpdateLevel(userId);
  }

  async checkAndUpdateLevel(userId: string): Promise<number> {
    const user = await this.db.get('SELECT total_points, level FROM users WHERE id = ?', userId);

    if (!user) {
      throw new Error('User not found');
    }

    const newLevel = this.calculateLevel(user.total_points);

    if (newLevel > user.level) {
      await this.db.run('UPDATE users SET level = ? WHERE id = ?', newLevel, userId);

      const levelUpBonus = newLevel * 100;
      await this.awardPoints(userId, levelUpBonus, `Level ${newLevel} bonus`);

      return newLevel;
    }

    return user.level;
  }

  calculateLevel(totalPoints: number): number {
    return Math.floor(Math.sqrt(totalPoints / 100)) + 1;
  }

  async checkAchievements(userId: string): Promise<string[]> {
    const achievements = await this.db.all('SELECT * FROM achievements');
    const earnedIds: string[] = [];

    for (const achievement of achievements) {
      const alreadyEarned = await this.db.get(
        'SELECT id FROM user_achievements WHERE user_id = ? AND achievement_id = ?',
        userId,
        achievement.id
      );

      if (alreadyEarned) {
        continue;
      }

      const eligible = await this.checkAchievementEligibility(userId, achievement);

      if (eligible) {
        const achievementId = uuidv4();
        await this.db.run(
          'INSERT INTO user_achievements (id, user_id, achievement_id) VALUES (?, ?, ?)',
          achievementId,
          userId,
          achievement.id
        );

        await this.awardPoints(userId, achievement.points_value, `Achievement: ${achievement.name}`);
        earnedIds.push(achievement.id);
      }
    }

    return earnedIds;
  }

  private async checkAchievementEligibility(userId: string, achievement: any): Promise<boolean> {
    switch (achievement.requirement_type) {
      case 'measurements': {
        const count = await this.db.get(
          'SELECT COUNT(*) as count FROM water_usage WHERE user_id = ?',
          userId
        );
        return count.count >= achievement.requirement_value;
      }

      case 'total_savings': {
        const savings = await this.db.get(
          'SELECT SUM(savings) as total FROM daily_usage_summary WHERE user_id = ?',
          userId
        );
        return (savings?.total || 0) >= achievement.requirement_value;
      }

      case 'challenges_completed': {
        const count = await this.db.get(
          'SELECT COUNT(*) as count FROM user_challenges WHERE user_id = ? AND completed = 1',
          userId
        );
        return count.count >= achievement.requirement_value;
      }

      case 'consecutive_days': {
        const recentDays = await this.db.all(
          `SELECT date FROM daily_usage_summary
           WHERE user_id = ? AND savings > 0
           ORDER BY date DESC LIMIT ?`,
          userId,
          achievement.requirement_value
        );

        if (recentDays.length < achievement.requirement_value) {
          return false;
        }

        for (let i = 0; i < recentDays.length - 1; i++) {
          const current = new Date(recentDays[i].date);
          const next = new Date(recentDays[i + 1].date);
          const diffDays = (current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24);

          if (diffDays !== 1) {
            return false;
          }
        }

        return true;
      }

      case 'level': {
        const user = await this.db.get('SELECT level FROM users WHERE id = ?', userId);
        return user.level >= achievement.requirement_value;
      }

      default:
        return false;
    }
  }
}
