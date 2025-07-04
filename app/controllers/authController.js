// controllers/authController.js
const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');
const { catchAsync, createError } = require('../utils/errorHandler');
/**
 * @desc    注册新用户
 * @route   POST /api/auth/register
 * @access  公开
 */
exports.register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  // 验证输入
  if (!username || !email || !password) {
    return res.status(400).json({ message: '请提供所有必填字段' });
  }

  // 检查用户是否已存在
  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: '该邮箱已被注册' });
  }

  // 创建用户
  const user = await User.create({
    username,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    points: config.points.signupBonus || 100, // 注册奖励积分
  });

  // 生成访问令牌
  const accessToken = jwt.sign(
    { id: user.id }, 
    config.auth.jwtSecret, 
    { expiresIn: config.auth.jwtExpiration }
  );

  // 返回用户数据和令牌
  res.status(201).json({
    id: user.id,
    username: user.username,
    email: user.email,
    points: user.points,
    accessToken
  });
});

/**
 * @desc    用户登录
 * @route   POST /api/auth/login
 * @access  公开
 */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // 验证输入
  if (!email || !password) {
    return res.status(400).json({ message: '请输入邮箱和密码' });
  }

  // 查找用户
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ message: '无效的邮箱或密码' });
  }

  // 验证密码
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    return res.status(401).json({ message: '无效的邮箱或密码' });
  }

  // 生成访问令牌
  const accessToken = jwt.sign(
    { id: user.id }, 
    config.auth.jwtSecret, 
    { expiresIn: config.auth.jwtExpiration }
  );

  // 返回用户数据和令牌
  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    points: user.points,
    accessToken
  });
});

/**
 * @desc    获取当前用户信息（可选）
 * @route   GET /api/auth/me
 * @access  私有
 */
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-passwordHash');
  
  if (!user) {
    return res.status(404).json({ message: '用户不存在' });
  }
  
  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    points: user.points,
    createdAt: user.createdAt
  });
});