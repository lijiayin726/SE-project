// services/socialService.js
const Challenge = require('../models/Challenge');
const User = require('../models/User');
const config = require('../config/config');

/**
 * 创建社交挑战
 * @param {string} userId - 用户ID
 * @param {Object} challengeData - 挑战数据
 * @returns {Promise<Object>} 创建的挑战对象
 */
exports.createSocialChallenge = async (userId, challengeData) => {
  const { title, stakePoints, endDate } = challengeData;
  
  // 验证输入
  if (!title || !stakePoints || stakePoints < 10) {
    throw new Error('请提供有效的挑战标题和押金积分（至少10积分）');
  }
  
  // 获取用户
  const user = await User.findById(userId);
  if (!user) throw new Error('用户不存在');
  
  // 检查积分是否足够
  if (user.points < stakePoints) {
    throw new Error('积分不足');
  }
  
  // 创建社交挑战
  const challenge = new Challenge({
    userId,
    title,
    description: challengeData.description || '',
    targetValue: challengeData.targetValue || 1,
    endDate: endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 默认7天
    stakePoints,
    isSocial: true,
    participants: [userId] // 创建者自动加入
  });
  
  // 扣除押金
  user.points -= stakePoints;
  
  // 保存挑战和用户更新
  await Promise.all([challenge.save(), user.save()]);
  
  return challenge;
};

/**
 * 加入社交挑战
 * @param {string} userId - 用户ID
 * @param {string} challengeId - 挑战ID
 * @returns {Promise<Object>} 更新后的挑战对象
 */
exports.joinSocialChallenge = async (userId, challengeId) => {
  // 获取挑战
  const challenge = await Challenge.findById(challengeId);
  if (!challenge) throw new Error('挑战不存在');
  
  // 验证是否是社交挑战
  if (!challenge.isSocial) throw new Error('这不是一个社交挑战');
  
  // 检查挑战是否已结束
  if (challenge.endDate < new Date()) {
    throw new Error('挑战已结束，无法加入');
  }
  
  // 检查用户是否已加入
  if (challenge.participants.includes(userId)) {
    throw new Error('您已加入此挑战');
  }
  
  // 获取用户
  const user = await User.findById(userId);
  if (!user) throw new Error('用户不存在');
  
  // 检查积分是否足够
  if (user.points < challenge.stakePoints) {
    throw new Error('积分不足');
  }
  
  // 扣除押金
  user.points -= challenge.stakePoints;
  
  // 添加参与者
  challenge.participants.push(userId);
  
  // 保存更新
  await Promise.all([challenge.save(), user.save()]);
  
  return challenge;
};

/**
 * 结算社交挑战
 * @param {string} userId - 用户ID（必须是创建者）
 * @param {string} challengeId - 挑战ID
 * @returns {Promise<Object>} 结算结果
 */
exports.settleSocialChallenge = async (userId, challengeId) => {
  // 获取挑战
  const challenge = await Challenge.findById(challengeId);
  if (!challenge) throw new Error('挑战不存在');
  
  // 验证是否是社交挑战
  if (!challenge.isSocial) throw new Error('这不是一个社交挑战');
  
  // 检查挑战是否已结束
  if (challenge.endDate > new Date()) {
    throw new Error('挑战尚未结束');
  }
  
  // 检查用户是否是创建者
  if (challenge.userId.toString() !== userId) {
    throw new Error('只有挑战创建者可以结算');
  }
  
  // 检查是否已结算
  if (challenge.isSettled) {
    throw new Error('挑战已结算');
  }
  
  // 获取所有参与者
  const participants = await User.find({ 
    _id: { $in: challenge.participants } 
  });
  
  // 确定获胜者（简化逻辑：所有参与者都获胜）
  const winners = participants.map(p => p._id);
  
  // 计算总奖池和每人奖励
  const totalPot = challenge.stakePoints * challenge.participants.length;
  const rewardPerWinner = winners.length > 0 
    ? Math.floor(totalPot / winners.length) 
    : 0;
  
  // 更新获胜者积分
  for (const winner of participants) {
    winner.points += rewardPerWinner;
    await winner.save();
  }
  
  // 更新挑战状态
  challenge.isSettled = true;
  challenge.winners = winners;
  challenge.settledAt = new Date();
  
  await challenge.save();
  
  return {
    challengeId: challenge.id,
    title: challenge.title,
    winners: winners.map(id => id.toString()),
    rewardPerWinner,
    totalPot
  };
};

/**
 * 获取活跃的社交挑战列表
 * @returns {Promise<Array>} 社交挑战列表
 */
exports.getActiveSocialChallenges = async () => {
  return Challenge.find({
    isSocial: true,
    endDate: { $gt: new Date() }, // 尚未结束
    isSettled: false // 尚未结算
  }).select('title stakePoints participants endDate createdAt')
    .populate('userId', 'username')
    .populate('participants', 'username');
};

/**
 * 获取用户参与的社交挑战
 * @param {string} userId - 用户ID
 * @returns {Promise<Array>} 用户参与的挑战列表
 */
exports.getUserSocialChallenges = async (userId) => {
  return Challenge.find({
    isSocial: true,
    participants: userId
  }).sort({ endDate: 1 }) // 按结束时间升序
    .select('title stakePoints endDate isSettled');
};

/**
 * 检查用户是否可以加入挑战
 * @param {string} userId - 用户ID
 * @param {string} challengeId - 挑战ID
 * @returns {Promise<boolean>} 是否可以加入
 */
exports.canJoinChallenge = async (userId, challengeId) => {
  const challenge = await Challenge.findById(challengeId);
  if (!challenge) return false;
  
  // 检查挑战是否活跃
  if (!challenge.isSocial || challenge.isSettled || challenge.endDate < new Date()) {
    return false;
  }
  
  // 检查用户是否已加入
  if (challenge.participants.includes(userId)) {
    return false;
  }
  
  // 检查用户积分
  const user = await User.findById(userId);
  if (!user || user.points < challenge.stakePoints) {
    return false;
  }
  
  return true;
};