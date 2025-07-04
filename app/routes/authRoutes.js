// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../utils/auth');

// 公开路由
router.post('/register', authController.register);
router.post('/login', authController.login);

// 需要认证的路由（可选）
router.get('/me', protect, authController.getMe);

module.exports = router;