const express = require('express');
const router = express.Router();
const {
    getAllBadges,
    getUserBadges,
    checkAndAwardBadges,
    initializeBadges
} = require('../controllers/badgeController');
const { protect } = require('../middleware/auth');

router.get('/', getAllBadges);
router.get('/user/:userId', getUserBadges);
router.post('/check', protect, checkAndAwardBadges);
router.post('/init', initializeBadges); // Should be protected with admin middleware in production

module.exports = router;
