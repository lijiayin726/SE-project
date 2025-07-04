const express = require('express');
const router = express.Router();
const challengeController = require('../controllers/challengeController');
const authMiddleware = require('../utils/auth');

// 保护路由
router.use(authMiddleware);

router.post('/', challengeController.createChallenge);
router.get('/', challengeController.getUserChallenges);
router.post('/:id/progress', challengeController.logProgress);

module.exports = router;