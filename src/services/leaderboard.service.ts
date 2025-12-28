import { Database } from 'sqlite';
import { v4 as uuidv4 } from 'uuid';
import { LeaderboardEntry } from '../types';

export class LeaderboardService {
  constructor(private db: Database) {}

  async updateLeaderboard(period: 'daily' | 'weekly' | 'monthly' | 'all-time'): Promise<void> {
    const { startDate, endDate } = this.getPeriodDates(period);

    await this.db.run('DELETE FROM leaderboard WHERE period = ?', period);

    let query: string;

    if (period === 'all-time') {
      query = `
        SELECT
          u.id as user_id,
          u.username,
          u.display_name,
          u.total_points,
          COALESCE(SUM(d.savings), 0) as total_savings
        FROM users u
        LEFT JOIN daily_usage_summary d ON u.id = d.user_id
        GROUP BY u.id
        ORDER BY u.total_points DESC, total_savings DESC
        LIMIT 100
      `;
    } else {
      query = `
        SELECT
          u.id as user_id,
          u.username,
          u.display_name,
          COALESCE(SUM(d.points_earned), 0) as total_points,
          COALESCE(SUM(d.savings), 0) as total_savings
        FROM users u
        LEFT JOIN daily_usage_summary d ON u.id = d.user_id AND d.date >= ? AND d.date <= ?
        GROUP BY u.id
        HAVING total_points > 0
        ORDER BY total_points DESC, total_savings DESC
        LIMIT 100
      `;
    }

    const results = period === 'all-time'
      ? await this.db.all(query)
      : await this.db.all(query, startDate, endDate);

    let rank = 1;
    for (const row of results) {
      const id = uuidv4();
      await this.db.run(
        `INSERT INTO leaderboard
         (id, user_id, username, display_name, total_points, total_savings, rank, period, period_start, period_end)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        row.user_id,
        row.username,
        row.display_name,
        row.total_points,
        row.total_savings,
        rank,
        period,
        startDate,
        endDate
      );
      rank++;
    }
  }

  async getLeaderboard(
    period: 'daily' | 'weekly' | 'monthly' | 'all-time',
    limit: number = 50
  ): Promise<LeaderboardEntry[]> {
    const entries = await this.db.all(
      `SELECT * FROM leaderboard
       WHERE period = ?
       ORDER BY rank ASC
       LIMIT ?`,
      period,
      limit
    );

    return entries;
  }

  async getUserRank(userId: string, period: 'daily' | 'weekly' | 'monthly' | 'all-time'): Promise<number | null> {
    const entry = await this.db.get(
      'SELECT rank FROM leaderboard WHERE user_id = ? AND period = ?',
      userId,
      period
    );

    return entry?.rank || null;
  }

  private getPeriodDates(period: 'daily' | 'weekly' | 'monthly' | 'all-time'): { startDate: string; endDate: string } {
    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    let startDate: string;

    switch (period) {
      case 'daily':
        startDate = endDate;
        break;
      case 'weekly':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString().split('T')[0];
        break;
      case 'monthly':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        startDate = monthAgo.toISOString().split('T')[0];
        break;
      case 'all-time':
        startDate = '2000-01-01';
        break;
    }

    return { startDate, endDate };
  }
}
