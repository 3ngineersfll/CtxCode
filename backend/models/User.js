const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [30, 'Username cannot exceed 30 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false
    },
    displayName: {
        type: String,
        required: [true, 'Display name is required'],
        trim: true
    },
    avatar: {
        type: String,
        default: 'default-avatar.png'
    },
    deviceId: {
        type: String,
        default: null
    },
    totalWaterSaved: {
        type: Number,
        default: 0
    },
    currentStreak: {
        type: Number,
        default: 0
    },
    longestStreak: {
        type: Number,
        default: 0
    },
    lastActiveDate: {
        type: Date,
        default: Date.now
    },
    badges: [{
        badgeId: String,
        earnedAt: {
            type: Date,
            default: Date.now
        }
    }],
    stats: {
        totalUsage: { type: Number, default: 0 },
        dailyAverage: { type: Number, default: 0 },
        weeklyAverage: { type: Number, default: 0 },
        monthlyAverage: { type: Number, default: 0 },
        conservationScore: { type: Number, default: 0 }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Calculate conservation score
userSchema.methods.calculateConservationScore = function() {
    const baseScore = Math.max(0, 1000 - this.stats.dailyAverage);
    const streakBonus = this.currentStreak * 10;
    const badgeBonus = this.badges.length * 50;

    this.stats.conservationScore = baseScore + streakBonus + badgeBonus;
    return this.stats.conservationScore;
};

module.exports = mongoose.model('User', userSchema);
