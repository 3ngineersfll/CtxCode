const express = require('express');
const router = express.Router();
const {
    getLeaderboard,
    getUserRank,
    getWeeklyTop
} = require('../controllers/leaderboardController');

router.get('/', getLeaderboard);
router.get('/rank/:userId', getUserRank);
router.get('/weekly', getWeeklyTop);

module.exports = router;
