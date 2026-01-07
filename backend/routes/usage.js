const express = require('express');
const router = express.Router();
const {
    submitUsage,
    getHistory,
    getDailySummary
} = require('../controllers/usageController');
const { protect } = require('../middleware/auth');

router.post('/', protect, submitUsage);
router.get('/history', protect, getHistory);
router.get('/summary/daily', protect, getDailySummary);

module.exports = router;
