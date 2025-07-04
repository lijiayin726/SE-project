// controllers/progressController.js
const asyncHandler = require('express-async-handler');
const Challenge = require('../models/Challenge');
const ProgressLog = require('../models/ProgressLog');

/**
 * @desc    记录挑战进度
 * @route   POST /api/progress/:challengeId
 * @access  私有
 */
exports.logProgress = asyncHandler(async (req, res) => {
  const { value, notes } = req.body;
  const challengeId = req.params.challengeId;
  
  // 验证输入
  if (value === undefined || value === null) {
    return res.status(400).json({ message: '请提供进度值' });
  }
  
  // 查找挑战
  const challenge = await Challenge.findById(challengeId);
  
  if (!challenge) {
    return res.status(404).json({ message: '挑战未找到' });
  }
  
  // 检查挑战是否属于当前用户
  if (challenge.userId.toString() !== req.user.id) {
    return res.status(403).json({ message: '无权操作此挑战' });
  }
  
  // 检查挑战是否已完成
  if (challenge.isCompleted) {
    return res.status(400).json({ message: '挑战已完成，无法再记录进度' });
  }
  
  // 创建进度记录
  const progressLog = await ProgressLog.create({
    challengeId,
    value,
    notes: notes || '',
    userId: req.user.id
  });
  
  // 更新挑战进度
  challenge.currentValue += value;
  
  // 检查挑战是否完成
  if (challenge.currentValue >= challenge.targetValue) {
    challenge.isCompleted = true;
    challenge.completedAt = new Date();
  }
  
  await challenge.save();
  
  // 返回进度记录和更新后的挑战信息
  res.status(201).json({
    progressLog,
    challenge: {
      id: challenge.id,
      title: challenge.title,
      currentValue: challenge.currentValue,
      targetValue: challenge.targetValue,
      isCompleted: challenge.isCompleted,
      completionRate: Math.min(100, Math.round((challenge.currentValue / challenge.targetValue) * 100))
    }
  });
});

/**
 * @desc    获取挑战进度历史
 * @route   GET /api/progress/:challengeId
 * @access  私有
 */
exports.getProgressHistory = asyncHandler(async (req, res) => {
  const challengeId = req.params.challengeId;
  
  // 查找挑战
  const challenge = await Challenge.findById(challengeId);
  
  if (!challenge) {
    return res.status(404).json({ message: '挑战未找到' });
  }
  
  // 检查挑战是否属于当前用户
  if (challenge.userId.toString() !== req.user.id) {
    return res.status(403).json({ message: '无权查看此挑战进度' });
  }
  
  // 获取进度历史
  const progressHistory = await ProgressLog.find({ challengeId })
    .sort({ createdAt: -1 }) // 按时间倒序
    .select('-userId -__v'); // 排除不必要字段
  
  // 计算挑战统计数据
  const totalDays = Math.ceil((challenge.endDate - challenge.startDate) / (1000 * 60 * 60 * 24));
  const completedDays = progressHistory.length;
  const successRate = completedDays > 0 
    ? Math.round((progressHistory.filter(log => log.value > 0).length / completedDays) * 100)
    : 0;
  
  // 返回进度历史和统计数据
  res.json({
    challenge: {
      id: challenge.id,
      title: challenge.title,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
      currentValue: challenge.currentValue,
      targetValue: challenge.targetValue,
      isCompleted: challenge.isCompleted
    },
    progressHistory,
    stats: {
      totalDays,
      completedDays,
      successRate,
      remainingDays: Math.max(0, Math.ceil((challenge.endDate - new Date()) / (1000 * 60 * 60 * 24))),
      completionRate: Math.min(100, Math.round((challenge.currentValue / challenge.targetValue) * 100))
    }
  });
});