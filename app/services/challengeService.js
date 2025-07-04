const Challenge = require('../models/Challenge');
const User = require('../models/User');
const aiService = require('./aiService');
const config = require('../config/config'); // 按需引入

// 创建挑战
exports.createChallenge = async (userId, challengeData) => {
  const challenge = new Challenge({
    userId,
    ...challengeData
  });
  
  // 设置首次提醒
  const firstReminder = await aiService.calculateBestReminderTime(userId);
  challenge.reminders.push({
    time: firstReminder,
    message: `不要忘记您的挑战: ${challengeData.title}!`,
    sent: false
  });
  
  await challenge.save();
  return challenge;
};

// 记录进度
exports.logProgress = async (challengeId, userId, value, notes) => {
  const challenge = await Challenge.findById(challengeId);
  
  if (!challenge) throw new Error('挑战未找到');
  if (challenge.userId.toString() !== userId) throw new Error('未授权访问');
  
  // 更新进度
  challenge.currentValue += value;
  
  // 检查是否完成
  if (challenge.currentValue >= challenge.targetValue && !challenge.isCompleted) {
    challenge.isCompleted = true;
    
    // 发放奖励
    const user = await User.findById(userId);
    user.points += challenge.rewardPoints;
    await user.save();
  }
  
  await challenge.save();
  return challenge;
};