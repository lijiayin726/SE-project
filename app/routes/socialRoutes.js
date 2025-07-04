// routes/socialRoutes.js
const express = require('express');
const router = express.Router();
const socialController = require('../controllers/socialController');
const { protect } = require('../utils/auth');

// 保护所有社交路由
router.use(protect);

// 创建社交挑战
router.post('/challenges', socialController.createSocialChallenge);

// 加入社交挑战
router.post('/challenges/:id/join', socialController.joinSocialChallenge);

// 结算社交挑战
router.post('/challenges/:id/settle', socialController.settleSocialChallenge);

// 获取社交挑战列表
router.get('/challenges', socialController.getSocialChallenges);

module.exports = router;