const mongoose = require('mongoose');

const usageDataSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    timestamp: {
        type: Date,
        required: true,
        index: true
    },
    flowRate: {
        type: Number,
        required: true,
        min: 0
    },
    totalVolume: {
        type: Number,
        required: true,
        min: 0
    },
    duration: {
        type: Number,
        default: 0
    },
    date: {
        type: String,
        required: true,
        index: true
    }
}, {
    timestamps: true
});

// Index for efficient queries
usageDataSchema.index({ userId: 1, date: -1 });
usageDataSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('UsageData', usageDataSchema);
