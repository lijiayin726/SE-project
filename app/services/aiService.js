// services/aiService.js
const Challenge = require('../models/Challenge');
const User = require('../models/User');
const config = require('../config/config');

/**
 * 计算用户的最佳提醒时间
 * @param {string} userId - 用户ID
 * @returns {Promise<Date>} 最佳提醒时间
 */
exports.calculateBestReminderTime = async (userId) => {
  try {
    // 获取用户最近7天的挑战完成时间
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const completedChallenges = await Challenge.find({
      userId,
      isCompleted: true,
      completedAt: { $gte: sevenDaysAgo }
    }).sort({ completedAt: -1 });
    
    // 如果没有数据，返回默认时间（下午6点）
    if (completedChallenges.length === 0) {
      return getDefaultReminderTime();
    }
    
    // 计算平均完成时间
    let totalHours = 0;
    for (const challenge of completedChallenges) {
      const hour = challenge.completedAt.getHours();
      totalHours += hour;
    }
    
    const averageHour = Math.round(totalHours / completedChallenges.length);
    
    // 创建最佳提醒时间（明天 + 平均小时）
    const bestTime = new Date();
    bestTime.setDate(bestTime.getDate() + 1); // 明天
    bestTime.setHours(averageHour, 0, 0, 0); // 设置小时
    
    return bestTime;
  } catch (error) {
    console.error('计算最佳提醒时间失败:', error);
    return getDefaultReminderTime();
  }
};

/**
 * 生成个性化挑战建议
 * @param {string} userId - 用户ID
 * @returns {Promise<Array>} 挑战建议列表
 */
exports.generateChallengeSuggestions = async (userId) => {
  // 获取用户完成最多的挑战类型
  const challengeTypes = await Challenge.aggregate([
    { $match: { userId, isCompleted: true } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 1 }
  ]);
  
  // 获取用户最成功的挑战类型
  const mostSuccessfulType = challengeTypes.length > 0 
    ? challengeTypes[0]._id 
    : 'custom';
  
  // 基础挑战建议
  const baseSuggestions = [
    {
      title: '每日晨跑',
      type: 'exercise',
      description: '每天早晨跑步15分钟',
      targetValue: 7,
      rewardPoints: 35
    },
    {
      title: '专注工作',
      type: 'no_phone',
      description: '工作时间不使用手机',
      targetValue: 5,
      rewardPoints: 25
    },
    {
      title: '学习新技能',
      type: 'study',
      description: '每天学习30分钟',
      targetValue: 7,
      rewardPoints: 35
    },
    {
      title: '早睡早起',
      type: 'custom',
      description: '晚上11点前睡觉，早晨7点前起床',
      targetValue: 7,
      rewardPoints: 35
    }
  ];
  
  // 根据用户偏好推荐
  const personalizedSuggestions = baseSuggestions.map(suggestion => {
    if (suggestion.type === mostSuccessfulType) {
      return {
        ...suggestion,
        title: `[推荐] ${suggestion.title}`,
        rewardPoints: suggestion.rewardPoints + 10 // 额外奖励
      };
    }
    return suggestion;
  });
  
  // 随机排序并返回前3条建议
  return shuffleArray(personalizedSuggestions).slice(0, 3);
};

/**
 * 预测挑战成功概率
 * @param {string} challengeId - 挑战ID
 * @returns {Promise<number>} 成功概率 (0-100)
 */
exports.predictSuccessProbability = async (challengeId) => {
  const challenge = await Challenge.findById(challengeId);
  if (!challenge) return 50; // 默认50%概率
  
  // 简单规则：
  // - 已完成挑战：100%
  // - 进度超过50%：80%
  // - 进度超过25%：60%
  // - 其他：40%
  const progressRate = challenge.currentValue / challenge.targetValue;
  
  if (challenge.isCompleted) return 100;
  if (progressRate >= 0.5) return 80;
  if (progressRate >= 0.25) return 60;
  return 40;
};

/**
 * 生成挑战进度报告
 * @param {string} userId - 用户ID
 * @returns {Promise<string>} 报告文本
 */
exports.generateProgressReport = async (userId) => {
  // 获取用户数据
  const user = await User.findById(userId);
  const challenges = await Challenge.find({ userId });
  
  // 计算统计数据
  const totalChallenges = challenges.length;
  const completedChallenges = challenges.filter(c => c.isCompleted).length;
  const completionRate = totalChallenges > 0 
    ? Math.round((completedChallenges / totalChallenges) * 100)
    : 0;
  
  // 获取最成功的挑战类型
  let mostSuccessfulType = '暂无';
  if (completedChallenges > 0) {
    const typeCounts = challenges.reduce((acc, challenge) => {
      if (challenge.isCompleted) {
        acc[challenge.type] = (acc[challenge.type] || 0) + 1;
      }
      return acc;
    }, {});
    
    mostSuccessfulType = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])[0][0];
  }
  
  // 生成报告
  return `
用户报告：${user.username}
=============================
• 总挑战数：${totalChallenges}
• 完成挑战：${completedChallenges}
• 完成率：${completionRate}%
• 最成功类型：${translateChallengeType(mostSuccessfulType)}
• 当前积分：${user.points}

${getEncouragementMessage(completionRate)}
`;
};

// ======= 辅助函数 =======

// 获取默认提醒时间（下午6点）
function getDefaultReminderTime() {
  const defaultTime = new Date();
  defaultTime.setHours(18, 0, 0, 0);
  return defaultTime;
}

// 随机打乱数组
function shuffleArray(array) {
  return array
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

// 翻译挑战类型
function translateChallengeType(type) {
  const translations = {
    exercise: '运动',
    no_phone: '戒手机',
    study: '学习',
    custom: '自定义'
  };
  return translations[type] || type;
}

// 获取鼓励消息
function getEncouragementMessage(completionRate) {
  if (completionRate >= 80) {
    return "太棒了！您的自律能力非常出色，继续保持！";
  }
  if (completionRate >= 50) {
    return "做得很好！坚持就是胜利，您正在不断进步！";
  }
  if (completionRate > 0) {
    return "好的开始是成功的一半！每天进步一点点，您会越来越强！";
  }
  return "开始您的第一个挑战吧！千里之行，始于足下！";
}