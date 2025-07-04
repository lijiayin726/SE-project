// routes/progressRoutes.js
const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');
const { protect } = require('../utils/auth');

// 保护所有进度路由
router.use(protect);

// 记录挑战进度
router.post('/:challengeId', progressController.logProgress);

// 获取挑战进度历史
router.get('/:challengeId', progressController.getProgressHistory);

module.exports = router;