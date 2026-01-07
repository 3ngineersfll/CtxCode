const { Badge, defaultBadges } = require('../models/Badge');
const User = require('../models/User');

// @desc    Get all badges
// @route   GET /api/badges
// @access  Public
exports.getAllBadges = async (req, res) => {
    try {
        const badges = await Badge.find().sort({ points: 1 });

        res.status(200).json({
            success: true,
            count: badges.length,
            data: badges
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching badges',
            error: error.message
        });
    }
};

// @desc    Get user's badges
// @route   GET /api/badges/user/:userId
// @access  Public
exports.getUserBadges = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId).select('badges displayName username');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get badge details
        const badgeIds = user.badges.map(b => b.badgeId);
        const badgeDetails = await Badge.find({ badgeId: { $in: badgeIds } });

        const userBadges = user.badges.map(userBadge => {
            const details = badgeDetails.find(b => b.badgeId === userBadge.badgeId);
            return {
                ...details?._doc,
                earnedAt: userBadge.earnedAt
            };
        });

        res.status(200).json({
            success: true,
            username: user.username,
            displayName: user.displayName,
            count: userBadges.length,
            data: userBadges
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching user badges',
            error: error.message
        });
    }
};

// @desc    Check and award badges
// @route   POST /api/badges/check
// @access  Private
exports.checkAndAwardBadges = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const newBadges = [];

        // Check for badge eligibility
        const allBadges = await Badge.find();

        for (const badge of allBadges) {
            // Skip if user already has this badge
            if (user.badges.some(b => b.badgeId === badge.badgeId)) {
                continue;
            }

            let earned = false;

            switch (badge.badgeId) {
                case 'first_drop':
                    earned = user.stats.totalUsage > 0;
                    break;
                case 'water_warrior':
                    earned = user.totalWaterSaved >= 100;
                    break;
                case 'eco_champion':
                    earned = user.totalWaterSaved >= 500;
                    break;
                case 'water_master':
                    earned = user.totalWaterSaved >= 1000;
                    break;
                case 'conservation_legend':
                    earned = user.totalWaterSaved >= 5000;
                    break;
                case 'streak_7':
                    earned = user.currentStreak >= 7;
                    break;
                case 'streak_30':
                    earned = user.currentStreak >= 30;
                    break;
                case 'efficient_user':
                    earned = user.stats.weeklyAverage < 50 && user.stats.weeklyAverage > 0;
                    break;
                // Add more badge logic here
            }

            if (earned) {
                user.badges.push({
                    badgeId: badge.badgeId,
                    earnedAt: new Date()
                });
                newBadges.push(badge);
            }
        }

        if (newBadges.length > 0) {
            await user.save();
        }

        res.status(200).json({
            success: true,
            newBadges: newBadges.length,
            data: newBadges
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error checking badges',
            error: error.message
        });
    }
};

// @desc    Initialize default badges
// @route   POST /api/badges/init
// @access  Private (Admin only)
exports.initializeBadges = async (req, res) => {
    try {
        // Clear existing badges
        await Badge.deleteMany({});

        // Insert default badges
        const badges = await Badge.insertMany(defaultBadges);

        res.status(201).json({
            success: true,
            count: badges.length,
            data: badges
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error initializing badges',
            error: error.message
        });
    }
};
