import { initDatabase, getDatabase } from '../src/database/init';
import { ChallengeService } from '../src/services/challenge.service';

async function seedChallenges() {
  try {
    await initDatabase();
    const db = await getDatabase();
    const challengeService = new ChallengeService(db);

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const sampleChallenges = [
      {
        title: 'Weekend Water Saver',
        description: 'Save 100 liters this weekend and earn bonus points!',
        challenge_type: 'daily' as const,
        target_value: 100,
        reward_points: 300,
        start_date: now.toISOString(),
        end_date: tomorrow.toISOString(),
        is_active: true
      },
      {
        title: 'Weekly Conservation Champion',
        description: 'Conserve 500 liters over the next week',
        challenge_type: 'weekly' as const,
        target_value: 500,
        reward_points: 1000,
        start_date: now.toISOString(),
        end_date: nextWeek.toISOString(),
        is_active: true
      },
      {
        title: 'Monthly Eco Warrior',
        description: 'Save 2000 liters this month and become an eco warrior!',
        challenge_type: 'monthly' as const,
        target_value: 2000,
        reward_points: 5000,
        start_date: now.toISOString(),
        end_date: nextMonth.toISOString(),
        is_active: true
      },
      {
        title: 'Shower Power Challenge',
        description: 'Reduce shower water usage by 30% this week',
        challenge_type: 'weekly' as const,
        target_value: 200,
        reward_points: 800,
        start_date: now.toISOString(),
        end_date: nextWeek.toISOString(),
        is_active: true
      },
      {
        title: 'Daily Drop Saver',
        description: 'Save 50 liters today!',
        challenge_type: 'daily' as const,
        target_value: 50,
        reward_points: 150,
        start_date: now.toISOString(),
        end_date: tomorrow.toISOString(),
        is_active: true
      }
    ];

    console.log('Seeding sample challenges...');

    for (const challenge of sampleChallenges) {
      const created = await challengeService.createChallenge(challenge);
      console.log(`✅ Created challenge: ${created.title}`);
    }

    console.log('\n🎉 Successfully seeded challenges!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding challenges:', error);
    process.exit(1);
  }
}

seedChallenges();
