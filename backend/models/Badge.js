const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
    badgeId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    icon: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['conservation', 'streak', 'achievement', 'special'],
        default: 'achievement'
    },
    requirement: {
        type: String,
        required: true
    },
    points: {
        type: Number,
        default: 100
    },
    rarity: {
        type: String,
        enum: ['common', 'rare', 'epic', 'legendary'],
        default: 'common'
    }
}, {
    timestamps: true
});

// Pre-populate badges
const defaultBadges = [
    {
        badgeId: 'first_drop',
        name: 'First Drop',
        description: 'Record your first water usage',
        icon: '💧',
        category: 'achievement',
        requirement: 'Record first usage',
        points: 50,
        rarity: 'common'
    },
    {
        badgeId: 'water_warrior',
        name: 'Water Warrior',
        description: 'Save 100 liters of water',
        icon: '🛡️',
        category: 'conservation',
        requirement: 'Save 100L',
        points: 100,
        rarity: 'common'
    },
    {
        badgeId: 'eco_champion',
        name: 'Eco Champion',
        description: 'Save 500 liters of water',
        icon: '🏆',
        category: 'conservation',
        requirement: 'Save 500L',
        points: 250,
        rarity: 'rare'
    },
    {
        badgeId: 'water_master',
        name: 'Water Master',
        description: 'Save 1000 liters of water',
        icon: '👑',
        category: 'conservation',
        requirement: 'Save 1000L',
        points: 500,
        rarity: 'epic'
    },
    {
        badgeId: 'streak_7',
        name: '7-Day Streak',
        description: 'Stay active for 7 consecutive days',
        icon: '🔥',
        category: 'streak',
        requirement: '7 day streak',
        points: 150,
        rarity: 'rare'
    },
    {
        badgeId: 'streak_30',
        name: '30-Day Streak',
        description: 'Stay active for 30 consecutive days',
        icon: '⭐',
        category: 'streak',
        requirement: '30 day streak',
        points: 500,
        rarity: 'epic'
    },
    {
        badgeId: 'efficient_user',
        name: 'Efficient User',
        description: 'Average daily usage under 50L for a week',
        icon: '⚡',
        category: 'conservation',
        requirement: 'Weekly avg < 50L',
        points: 200,
        rarity: 'rare'
    },
    {
        badgeId: 'community_leader',
        name: 'Community Leader',
        description: 'Rank in top 10 on the leaderboard',
        icon: '🌟',
        category: 'special',
        requirement: 'Top 10 rank',
        points: 300,
        rarity: 'epic'
    },
    {
        badgeId: 'conservation_legend',
        name: 'Conservation Legend',
        description: 'Save 5000 liters of water',
        icon: '💎',
        category: 'conservation',
        requirement: 'Save 5000L',
        points: 1000,
        rarity: 'legendary'
    },
    {
        badgeId: 'early_adopter',
        name: 'Early Adopter',
        description: 'Join the water conservation movement',
        icon: '🎯',
        category: 'special',
        requirement: 'Register account',
        points: 25,
        rarity: 'common'
    }
];

module.exports = {
    Badge: mongoose.model('Badge', badgeSchema),
    defaultBadges
};
