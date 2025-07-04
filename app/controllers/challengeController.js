const Challenge = require('../models/Challenge');
const challengeService = require('../services/challengeService');
const asyncHandler = require('express-async-handler');

// 创建挑战
exports.createChallenge = asyncHandler(async (req, res) => {
  const challenge = await challengeService.createChallenge(
    req.user.id, 
    req.body
  );
  res.status(201).json(challenge);
});

// 获取用户挑战
exports.getUserChallenges = asyncHandler(async (req, res) => {
  const challenges = await Challenge.find({ userId: req.user.id });
  res.json(challenges);
});

// 记录挑战进度
exports.logProgress = asyncHandler(async (req, res) => {
  const challenge = await challengeService.logProgress(
    req.params.id, 
    req.user.id,
    req.body.value,
    req.body.notes
  );
  res.json(challenge);
});