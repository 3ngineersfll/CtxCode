import { Database } from 'sqlite';
import { v4 as uuidv4 } from 'uuid';
import { WaterMeasurement, WaterUsage, DailyUsageSummary } from '../types';
import { PointsService } from './points.service';

export class WaterService {
  private pointsService: PointsService;

  constructor(private db: Database) {
    this.pointsService = new PointsService(db);
  }

  async recordUsage(userId: string, measurement: WaterMeasurement): Promise<WaterUsage> {
    const id = uuidv4();
    const timestamp = measurement.timestamp || new Date().toISOString();
    const unit = measurement.unit || 'liters';

    await this.db.run(
      `INSERT INTO water_usage (id, user_id, amount, unit, device_id, activity_type, timestamp, points_earned)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      userId,
      measurement.amount,
      unit,
      measurement.device_id || null,
      measurement.activity_type || null,
      timestamp,
      0
    );

    await this.updateDailySummary(userId, timestamp);

    const usage = await this.db.get('SELECT * FROM water_usage WHERE id = ?', id);

    await this.pointsService.checkAchievements(userId);

    return usage;
  }

  async updateDailySummary(userId: string, timestamp: string): Promise<void> {
    const date = timestamp.split('T')[0];

    const dailyTotal = await this.db.get(
      `SELECT SUM(amount) as total FROM water_usage
       WHERE user_id = ? AND DATE(timestamp) = ?`,
      userId,
      date
    );

    const totalUsage = dailyTotal?.total || 0;

    const points = await this.pointsService.calculateWaterSavingsPoints(userId, totalUsage, date);

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

    const averageBaseline = baseline?.avg_usage || totalUsage;
    const savings = Math.max(0, averageBaseline - totalUsage);

    const existingSummary = await this.db.get(
      'SELECT id FROM daily_usage_summary WHERE user_id = ? AND date = ?',
      userId,
      date
    );

    if (existingSummary) {
      await this.db.run(
        `UPDATE daily_usage_summary
         SET total_usage = ?, average_baseline = ?, savings = ?, points_earned = ?
         WHERE id = ?`,
        totalUsage,
        averageBaseline,
        savings,
        points,
        existingSummary.id
      );
    } else {
      const summaryId = uuidv4();
      await this.db.run(
        `INSERT INTO daily_usage_summary (id, user_id, date, total_usage, average_baseline, savings, points_earned)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        summaryId,
        userId,
        date,
        totalUsage,
        averageBaseline,
        savings,
        points
      );
    }

    if (points > 0) {
      await this.pointsService.awardPoints(userId, points, 'Water conservation');
    }
  }

  async getUserUsageHistory(
    userId: string,
    startDate?: string,
    endDate?: string,
    limit: number = 100
  ): Promise<WaterUsage[]> {
    let query = 'SELECT * FROM water_usage WHERE user_id = ?';
    const params: any[] = [userId];

    if (startDate) {
      query += ' AND timestamp >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND timestamp <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    return await this.db.all(query, ...params);
  }

  async getDailySummary(userId: string, days: number = 30): Promise<DailyUsageSummary[]> {
    return await this.db.all(
      `SELECT * FROM daily_usage_summary
       WHERE user_id = ?
       AND date >= date('now', '-' || ? || ' days')
       ORDER BY date DESC`,
      userId,
      days
    );
  }

  async getUserStats(userId: string): Promise<any> {
    const user = await this.db.get(
      'SELECT id, username, total_points, level FROM users WHERE id = ?',
      userId
    );

    if (!user) {
      throw new Error('User not found');
    }

    const totalUsage = await this.db.get(
      'SELECT SUM(total_usage) as total FROM daily_usage_summary WHERE user_id = ?',
      userId
    );

    const totalSavings = await this.db.get(
      'SELECT SUM(savings) as total FROM daily_usage_summary WHERE user_id = ?',
      userId
    );

    const achievementsCount = await this.db.get(
      'SELECT COUNT(*) as count FROM user_achievements WHERE user_id = ?',
      userId
    );

    const challengesCount = await this.db.get(
      'SELECT COUNT(*) as count FROM user_challenges WHERE user_id = ? AND completed = 1',
      userId
    );

    const rank = await this.db.get(
      'SELECT rank FROM leaderboard WHERE user_id = ? AND period = "all-time"',
      userId
    );

    return {
      user_id: user.id,
      username: user.username,
      total_points: user.total_points,
      level: user.level,
      total_usage: totalUsage?.total || 0,
      total_savings: totalSavings?.total || 0,
      achievements_earned: achievementsCount?.count || 0,
      challenges_completed: challengesCount?.count || 0,
      current_rank: rank?.rank || null
    };
  }
}
