const mongoose = require('mongoose');

const progressLogSchema = new mongoose.Schema({
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true // 自动添加 createdAt 和 updatedAt 字段
});

// 添加索引以优化查询
progressLogSchema.index({ challengeId: 1 });
progressLogSchema.index({ userId: 1 });

const ProgressLog = mongoose.model('ProgressLog', progressLogSchema);

module.exports = ProgressLog;