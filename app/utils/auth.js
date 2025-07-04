// utils/auth.js
const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * 认证中间件 - 保护路由
 */
exports.protect = (req, res, next) => {
  let token;
  
  // 从Authorization头获取令牌
  if (req.headers.authorization && 
      req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (!token) {
    return res.status(401).json({ 
      message: '未提供访问令牌，请先登录' 
    });
  }
  
  try {
    // 验证令牌
    const decoded = jwt.verify(token, config.auth.jwtSecret);
    
    // 将用户信息添加到请求对象
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    return res.status(401).json({ 
      message: '访问令牌无效或已过期' 
    });
  }
};