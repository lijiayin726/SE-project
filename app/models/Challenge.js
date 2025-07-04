const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['exercise', 'no_phone', 'study', 'custom'],
    default: 'custom'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  targetValue: {
    type: Number,
    required: true,
    min: 1
  },
  currentValue: {
    type: Number,
    default: 0,
    min: 0
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  },
  rewardPoints: {
    type: Number,
    default: 50
  },
  
  // 社交挑战专用字段
  isSocial: {
    type: Boolean,
    default: false
  },
  stakePoints: {
    type: Number,
    default: 0
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isSettled: {
    type: Boolean,
    default: false
  },
  winners: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

// 虚拟字段：完成率
challengeSchema.virtual('completionRate').get(function() {
  return Math.min(100, Math.round((this.currentValue / this.targetValue) * 100));
});

// 虚拟字段：剩余天数（社交挑战）
challengeSchema.virtual('daysRemaining').get(function() {
  if (!this.endDate) return 0;
  const now = new Date();
  return Math.ceil((this.endDate - now) / (1000 * 60 * 60 * 24));
});

// 虚拟字段：总奖池（社交挑战）
challengeSchema.virtual('totalPot').get(function() {
  return this.stakePoints * (this.participants?.length || 1);
});

const Challenge = mongoose.model('Challenge', challengeSchema);

module.exports = Challenge;