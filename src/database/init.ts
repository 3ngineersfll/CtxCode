import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import fs from 'fs';
import path from 'path';

let db: Database | null = null;

export async function initDatabase(dbPath: string = './water-conservation.db'): Promise<Database> {
  if (db) {
    return db;
  }

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  await db.exec(schema);
  await seedInitialData(db);

  console.log('✅ Database initialized successfully');
  return db;
}

async function seedInitialData(database: Database) {
  // Seed achievements
  const achievementCount = await database.get('SELECT COUNT(*) as count FROM achievements');

  if (achievementCount.count === 0) {
    const achievements = [
      {
        id: 'first-drop',
        name: 'First Drop',
        description: 'Record your first water measurement',
        icon: '💧',
        points_value: 50,
        requirement_type: 'measurements',
        requirement_value: 1
      },
      {
        id: 'water-warrior',
        name: 'Water Warrior',
        description: 'Save 1000 liters of water',
        icon: '🏆',
        points_value: 500,
        requirement_type: 'total_savings',
        requirement_value: 1000
      },
      {
        id: 'eco-champion',
        name: 'Eco Champion',
        description: 'Complete 10 challenges',
        icon: '🌟',
        points_value: 1000,
        requirement_type: 'challenges_completed',
        requirement_value: 10
      },
      {
        id: 'consistent-saver',
        name: 'Consistent Saver',
        description: 'Save water for 7 consecutive days',
        icon: '📅',
        points_value: 300,
        requirement_type: 'consecutive_days',
        requirement_value: 7
      },
      {
        id: 'conservation-master',
        name: 'Conservation Master',
        description: 'Reach level 10',
        icon: '👑',
        points_value: 2000,
        requirement_type: 'level',
        requirement_value: 10
      }
    ];

    for (const achievement of achievements) {
      await database.run(
        `INSERT INTO achievements (id, name, description, icon, points_value, requirement_type, requirement_value)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        achievement.id,
        achievement.name,
        achievement.description,
        achievement.icon,
        achievement.points_value,
        achievement.requirement_type,
        achievement.requirement_value
      );
    }

    console.log('✅ Seeded initial achievements');
  }

  // Seed sample rewards
  const rewardCount = await database.get('SELECT COUNT(*) as count FROM rewards');

  if (rewardCount.count === 0) {
    const rewards = [
      {
        id: 'voucher-10',
        name: '$10 Eco Store Voucher',
        description: 'Redeem for sustainable products',
        points_cost: 1000,
        reward_type: 'voucher',
        stock_available: -1,
        image_url: null
      },
      {
        id: 'tree-plant',
        name: 'Plant a Tree',
        description: 'We will plant a tree in your name',
        points_cost: 500,
        reward_type: 'donation',
        stock_available: -1,
        image_url: null
      },
      {
        id: 'water-filter',
        name: 'Premium Water Filter',
        description: 'High-quality water filtration system',
        points_cost: 5000,
        reward_type: 'physical',
        stock_available: 50,
        image_url: null
      },
      {
        id: 'eco-badge',
        name: 'Digital Eco Badge',
        description: 'Show off your conservation efforts',
        points_cost: 200,
        reward_type: 'digital',
        stock_available: -1,
        image_url: null
      }
    ];

    for (const reward of rewards) {
      await database.run(
        `INSERT INTO rewards (id, name, description, points_cost, reward_type, stock_available, image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        reward.id,
        reward.name,
        reward.description,
        reward.points_cost,
        reward.reward_type,
        reward.stock_available,
        reward.image_url
      );
    }

    console.log('✅ Seeded initial rewards');
  }
}

export async function getDatabase(): Promise<Database> {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase first.');
  }
  return db;
}

export async function closeDatabase() {
  if (db) {
    await db.close();
    db = null;
  }
}
