const User = require('../models/User');

// @desc    Get global leaderboard
// @route   GET /api/leaderboard
// @access  Public
exports.getLeaderboard = async (req, res) => {
    try {
        const { limit = 100, category = 'conservation' } = req.query;

        let sortField = 'stats.conservationScore';

        switch (category) {
            case 'conservation':
                sortField = 'stats.conservationScore';
                break;
            case 'streak':
                sortField = 'currentStreak';
                break;
            case 'badges':
                sortField = 'badges';
                break;
            default:
                sortField = 'stats.conservationScore';
        }

        const users = await User.find()
            .select('username displayName avatar stats currentStreak longestStreak badges')
            .sort({ [sortField]: -1 })
            .limit(parseInt(limit));

        // Add rank to each user
        const leaderboard = users.map((user, index) => ({
            rank: index + 1,
            userId: user._id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar,
            conservationScore: user.stats.conservationScore,
            currentStreak: user.currentStreak,
            longestStreak: user.longestStreak,
            badgeCount: user.badges.length,
            dailyAverage: user.stats.dailyAverage
        }));

        res.status(200).json({
            success: true,
            count: leaderboard.length,
            data: leaderboard
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching leaderboard',
            error: error.message
        });
    }
};

// @desc    Get user's rank
// @route   GET /api/leaderboard/rank/:userId
// @access  Public
exports.getUserRank = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Count users with higher conservation score
        const rank = await User.countDocuments({
            'stats.conservationScore': { $gt: user.stats.conservationScore }
        }) + 1;

        // Get total users
        const totalUsers = await User.countDocuments();

        res.status(200).json({
            success: true,
            data: {
                rank,
                totalUsers,
                percentile: ((totalUsers - rank) / totalUsers * 100).toFixed(2),
                conservationScore: user.stats.conservationScore
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching user rank',
            error: error.message
        });
    }
};

// @desc    Get top performers (weekly)
// @route   GET /api/leaderboard/weekly
// @access  Public
exports.getWeeklyTop = async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        // This is a simplified version. In production, you'd want to track weekly stats separately
        const users = await User.find()
            .select('username displayName avatar stats currentStreak')
            .sort({ 'stats.weeklyAverage': 1 }) // Lower is better for conservation
            .limit(parseInt(limit));

        const topPerformers = users.map((user, index) => ({
            rank: index + 1,
            userId: user._id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar,
            weeklyAverage: user.stats.weeklyAverage,
            currentStreak: user.currentStreak
        }));

        res.status(200).json({
            success: true,
            count: topPerformers.length,
            data: topPerformers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching weekly top performers',
            error: error.message
        });
    }
};
