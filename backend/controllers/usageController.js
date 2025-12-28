const UsageData = require('../models/UsageData');
const User = require('../models/User');

// @desc    Submit water usage data
// @route   POST /api/usage
// @access  Private
exports.submitUsage = async (req, res) => {
    try {
        const { flowRate, totalVolume, timestamp, date } = req.body;

        const usageData = await UsageData.create({
            userId: req.user.id,
            flowRate,
            totalVolume,
            timestamp: timestamp || new Date(),
            date: date || new Date().toISOString().split('T')[0]
        });

        // Update user stats
        await updateUserStats(req.user.id);

        res.status(201).json({
            success: true,
            data: usageData
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error submitting usage data',
            error: error.message
        });
    }
};

// @desc    Get user's usage history
// @route   GET /api/usage/history
// @access  Private
exports.getHistory = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const history = await UsageData.find({
            userId: req.user.id,
            timestamp: { $gte: startDate }
        }).sort({ timestamp: -1 });

        res.status(200).json({
            success: true,
            count: history.length,
            data: history
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching history',
            error: error.message
        });
    }
};

// @desc    Get daily usage summary
// @route   GET /api/usage/summary/daily
// @access  Private
exports.getDailySummary = async (req, res) => {
    try {
        const { days = 7 } = req.query;

        const summary = await UsageData.aggregate([
            {
                $match: {
                    userId: req.user._id
                }
            },
            {
                $group: {
                    _id: '$date',
                    totalVolume: { $sum: '$totalVolume' },
                    avgFlowRate: { $avg: '$flowRate' },
                    maxFlowRate: { $max: '$flowRate' },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: -1 }
            },
            {
                $limit: parseInt(days)
            }
        ]);

        res.status(200).json({
            success: true,
            data: summary
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching daily summary',
            error: error.message
        });
    }
};

// Helper function to update user stats
async function updateUserStats(userId) {
    const user = await User.findById(userId);

    // Calculate daily average (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentData = await UsageData.find({
        userId: userId,
        timestamp: { $gte: sevenDaysAgo }
    });

    if (recentData.length > 0) {
        const totalUsage = recentData.reduce((sum, data) => sum + data.totalVolume, 0);
        user.stats.totalUsage = totalUsage;
        user.stats.dailyAverage = totalUsage / 7;
    }

    // Calculate conservation score
    user.calculateConservationScore();

    await user.save();
}
