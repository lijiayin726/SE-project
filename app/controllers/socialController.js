// controllers/socialController.js
const asyncHandler = require('express-async-handler');
const Challenge = require('../models/Challenge');
const User = require('../models/User');

/**
 * @desc    创建社交挑战
 * @route   POST /api/social/challenges
 * @access  私有
 */
exports.createSocialChallenge = asyncHandler(async (req, res) => {
  const { title, description, targetValue, endDate, stakePoints } = req.body;
  
  // 验证输入
  if (!title || !stakePoints || stakePoints <= 0) {
    return res.status(400).json({ 
      message: '请提供挑战标题和有效的押金积分' 
    });
  }
  
  // 检查用户积分是否足够
  const user = await User.findById(req.user.id);
  if (user.points < stakePoints) {
    return res.status(400).json({ 
      message: '积分不足，无法创建挑战' 
    });
  }
  
  // 创建基础挑战
  const challenge = new Challenge({
    userId: req.user.id,
    title,
    description: description || '',
    targetValue: targetValue || 1, // 默认目标值1（如天数）
    endDate: endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 默认7天后结束
    stakePoints,
    isSocial: true,
    participants: [req.user.id] // 创建者自动加入
  });
  
  // 扣除押金积分
  user.points -= stakePoints;
  
  // 保存挑战和用户更新
  await Promise.all([challenge.save(), user.save()]);
  
  res.status(201).json({
    message: '社交挑战创建成功',
    challenge: {
      id: challenge.id,
      title: challenge.title,
      stakePoints: challenge.stakePoints,
      participants: challenge.participants,
      endDate: challenge.endDate
    }
  });
});

/**
 * @desc    加入社交挑战
 * @route   POST /api/social/challenges/:id/join
 * @access  私有
 */
exports.joinSocialChallenge = asyncHandler(async (req, res) => {
  const challengeId = req.params.id;
  
  // 查找挑战
  const challenge = await Challenge.findById(challengeId);
  
  if (!challenge) {
    return res.status(404).json({ message: '挑战未找到' });
  }
  
  // 检查是否是社交挑战
  if (!challenge.isSocial) {
    return res.status(400).json({ message: '这不是一个社交挑战' });
  }
  
  // 检查挑战是否已结束
  if (challenge.endDate < new Date()) {
    return res.status(400).json({ message: '挑战已结束，无法加入' });
  }
  
  // 检查用户是否已加入
  if (challenge.participants.includes(req.user.id)) {
    return res.status(400).json({ message: '您已加入此挑战' });
  }
  
  // 检查用户积分是否足够
  const user = await User.findById(req.user.id);
  if (user.points < challenge.stakePoints) {
    return res.status(400).json({ 
      message: '积分不足，无法加入挑战' 
    });
  }
  
  // 扣除押金积分
  user.points -= challenge.stakePoints;
  
  // 添加用户到参与者列表
  challenge.participants.push(req.user.id);
  
  // 保存更新
  await Promise.all([challenge.save(), user.save()]);
  
  res.json({
    message: '成功加入社交挑战',
    challenge: {
      id: challenge.id,
      title: challenge.title,
      stakePoints: challenge.stakePoints,
      participants: challenge.participants
    }
  });
});

/**
 * @desc    结算社交挑战
 * @route   POST /api/social/challenges/:id/settle
 * @access  私有（只有挑战创建者可结算）
 */
exports.settleSocialChallenge = asyncHandler(async (req, res) => {
  const challengeId = req.params.id;
  
  // 查找挑战
  const challenge = await Challenge.findById(challengeId);
  
  if (!challenge) {
    return res.status(404).json({ message: '挑战未找到' });
  }
  
  // 检查是否是社交挑战
  if (!challenge.isSocial) {
    return res.status(400).json({ message: '这不是一个社交挑战' });
  }
  
  // 检查挑战是否已结束
  if (challenge.endDate > new Date()) {
    return res.status(400).json({ message: '挑战尚未结束' });
  }
  
  // 检查用户是否是挑战创建者
  if (challenge.userId.toString() !== req.user.id) {
    return res.status(403).json({ 
      message: '只有挑战创建者可以结算挑战' 
    });
  }
  
  // 检查挑战是否已结算
  if (challenge.isSettled) {
    return res.status(400).json({ message: '挑战已结算' });
  }
  
  // 获取所有参与者
  const participants = await User.find({ 
    _id: { $in: challenge.participants } 
  });
  
  // 计算成功者和失败者
  const winners = [];
  const losers = [];
  
  // 检查每个参与者是否完成挑战
  for (const participant of participants) {
    // 简化逻辑：假设所有参与者都完成了挑战
    // 实际应用中应根据具体挑战规则判断
    winners.push(participant._id);
  }
  
  // 如果没有成功者，所有押金不退还
  if (winners.length === 0) {
    challenge.isSettled = true;
    await challenge.save();
    return res.json({ 
      message: '挑战已结算，没有成功者，所有押金不退还',
      winners: [],
      losers: challenge.participants
    });
  }
  
  // 计算总奖池和每人奖励
  const totalPot = challenge.stakePoints * challenge.participants.length;
  const rewardPerWinner = Math.floor(totalPot / winners.length);
  
  // 给成功者分配奖励
  for (const winnerId of winners) {
    const winner = participants.find(p => p._id.equals(winnerId));
    winner.points += rewardPerWinner;
    await winner.save();
  }
  
  // 标记挑战为已结算
  challenge.isSettled = true;
  challenge.winners = winners;
  
  // 保存挑战状态
  await challenge.save();
  
  res.json({
    message: '挑战已成功结算',
    winners,
    rewardPerWinner,
    totalPot
  });
});

/**
 * @desc    获取社交挑战列表
 * @route   GET /api/social/challenges
 * @access  私有
 */
exports.getSocialChallenges = asyncHandler(async (req, res) => {
  // 获取未结束的社交挑战
  const challenges = await Challenge.find({
    isSocial: true,
    endDate: { $gt: new Date() }, // 尚未结束
    isSettled: false // 尚未结算
  }).select('title description stakePoints participants endDate createdAt');
  
  res.json(challenges);
});