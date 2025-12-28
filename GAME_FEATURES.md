# Water Conservation Game - Game Features Guide

## Overview

The Water Conservation Game transforms water usage tracking into an engaging competitive experience with rewards for conservation.

## Core Game Mechanics

### 1. Points & Leveling System

**Earning Points:**
- Record water usage: Base points
- Save water vs. baseline: Bonus multipliers
- Complete challenges: Large rewards
- Unlock achievements: One-time bonuses
- Level up: Progressive bonuses

**Savings Multipliers:**
```
Savings %    | Multiplier
-------------|------------
20-29%       | 1.5x
30-49%       | 2.0x
50%+         | 3.0x
```

**Level Calculation:**
```
Level = floor(sqrt(total_points / 100)) + 1
```

**Level Up Bonus:**
```
Bonus Points = Current Level × 100
```

**Example:**
- User has 10,000 points
- Level = floor(sqrt(10000 / 100)) + 1 = 11
- Reaching level 11 awards 1,100 bonus points

### 2. Achievement System

Achievements are one-time unlockable badges that reward specific milestones.

**Pre-loaded Achievements:**

| Achievement | Icon | Requirement | Points |
|-------------|------|-------------|--------|
| First Drop | 💧 | Record 1st measurement | 50 |
| Water Warrior | 🏆 | Save 1,000L total | 500 |
| Eco Champion | 🌟 | Complete 10 challenges | 1,000 |
| Consistent Saver | 📅 | Save 7 consecutive days | 300 |
| Conservation Master | 👑 | Reach level 10 | 2,000 |

**How to Earn:**
- Achievements are automatically checked after each action
- Progress is tracked in real-time
- Notification appears when earned
- Points are immediately awarded

### 3. Challenge System

Challenges are time-limited conservation goals with bonus rewards.

**Challenge Types:**

**Daily Challenges**
- Duration: 24 hours
- Goal: Save X liters in one day
- Reward: 100-500 points
- Example: "Save 50L today"

**Weekly Challenges**
- Duration: 7 days
- Goal: Save X liters over the week
- Reward: 500-1,500 points
- Example: "Save 300L this week"

**Monthly Challenges**
- Duration: 30 days
- Goal: Save X liters over the month
- Reward: 2,000-5,000 points
- Example: "Save 1,000L this month"

**Challenge Progress:**
- Real-time progress tracking
- Visual progress bars
- Automatic completion detection
- Points awarded immediately on completion

### 4. Leaderboard System

Compete with others across multiple time periods.

**Leaderboard Periods:**

| Period | Timeframe | Updates |
|--------|-----------|---------|
| Daily | Last 24 hours | Every 5 minutes |
| Weekly | Last 7 days | Every 5 minutes |
| Monthly | Last 30 days | Every 5 minutes |
| All-Time | Lifetime | Every 5 minutes |

**Ranking Criteria:**
1. Primary: Total points
2. Secondary: Total water saved (tiebreaker)

**Top Ranks:**
- 🥇 Rank 1: Gold medal
- 🥈 Rank 2: Silver medal
- 🥉 Rank 3: Bronze medal
- #4+: Numbered ranking

**Leaderboard Features:**
- Real-time updates via WebSocket
- Highlight your own position
- See top 50 players
- Filter by time period

### 5. Rewards Redemption

Spend your hard-earned points on real rewards!

**Reward Categories:**

**🎫 Vouchers**
- Eco store discounts
- Sustainable product vouchers
- Partner merchant deals
- Point Cost: 500-2,000

**🌳 Donations**
- Plant a tree in your name
- Support water conservation projects
- Clean water initiatives
- Point Cost: 500-1,000

**📦 Physical Rewards**
- Water filters
- Eco-friendly products
- Conservation tools
- Point Cost: 2,000-10,000
- Limited stock availability

**💎 Digital Rewards**
- Exclusive badges
- Profile customization
- Premium features
- Point Cost: 200-500

**Redemption Process:**
1. Browse available rewards
2. Check your point balance
3. Click "Redeem"
4. Points are deducted
5. Reward status tracked (pending → approved → shipped → completed)

### 6. Water Usage Tracking

**Activity Types:**
- 🚿 Shower
- 🍽️ Dishwashing
- 👕 Laundry
- 🚽 Toilet
- 🌱 Gardening
- 🍳 Cooking
- ⚙️ Other

**Tracking Features:**
- Manual entry with amount
- Activity categorization
- Device ID support (for IoT sensors)
- Timestamp recording
- Historical data visualization

**Analytics:**
- Daily usage trends
- 30-day comparison charts
- Savings calculation vs. baseline
- Activity breakdown
- Conservation tips

## Game Strategies

### For New Players

1. **Week 1: Establish Baseline**
   - Record all water usage honestly
   - System calculates your average
   - Join your first challenge
   - Unlock "First Drop" achievement

2. **Week 2-4: Start Conserving**
   - Aim for 20%+ reduction
   - Complete daily challenges
   - Track shower times
   - Earn first rewards

3. **Month 2+: Optimize**
   - Target 30%+ savings for 2x multiplier
   - Join multiple challenges
   - Compete on leaderboards
   - Unlock advanced achievements

### Advanced Strategies

**Points Maximization:**
- Time your big savings for challenge completion
- Stack multiple challenges simultaneously
- Maintain consistent daily recording
- Focus on high-percentage savings days

**Leaderboard Climbing:**
- Consistent daily engagement
- Complete all active challenges
- Unlock high-value achievements
- Maintain conservation streaks

**Reward Optimization:**
- Save points for high-value items
- Monitor stock availability
- Redeem during special promotions
- Balance points vs. levels for bonuses

## Social Features

**Community Competition:**
- See friends on leaderboard
- Compare conservation stats
- Share achievements
- Challenge friends

**Real-time Updates:**
- Live leaderboard positions
- Achievement notifications
- Challenge completions
- Point updates

## Tips for Maximum Conservation

1. **Shorter Showers**: 5-10L per minute saved
2. **Full Loads**: Run dishwasher/laundry only when full
3. **Fix Leaks**: Small leaks = big waste
4. **Smart Gardening**: Water early morning or evening
5. **Reuse Water**: Cooking water for plants

## Seasonal Events

**Future Features:**
- Special seasonal challenges
- Holiday-themed achievements
- Bonus point weekends
- Limited-time exclusive rewards
- Community goals

## Frequently Asked Questions

**Q: How is my baseline calculated?**
A: Your 30-day rolling average, excluding the current day.

**Q: Can I lose points?**
A: No, points are never deducted except for reward redemption.

**Q: Do challenges expire?**
A: Yes, complete them before the end date or progress resets.

**Q: How often does the leaderboard update?**
A: Every 5 minutes automatically via WebSocket.

**Q: Can I earn the same achievement twice?**
A: No, achievements are one-time unlocks.

**Q: What happens if I don't record usage for a day?**
A: Your baseline adjusts, but challenge streaks may break.

---

Have fun conserving water and competing for the top spot!
