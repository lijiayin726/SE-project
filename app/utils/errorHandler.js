// utils/errorHandler.js
const winston = require('winston');
const config = require('../config/config');

/**
 * 配置 Winston 日志记录器
 */
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // 生产环境：记录到文件
    ...(config.app.env === 'production' ? [
      new winston.transports.File({ 
        filename: 'logs/error.log', 
        level: 'error',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5
      }),
      new winston.transports.File({ 
        filename: 'logs/combined.log',
        maxsize: 10 * 1024 * 1024,
        maxFiles: 5
      })
    ] : []),
    // 开发环境：输出到控制台
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(info => {
          return `${info.timestamp} ${info.level}: ${info.message}`;
        })
      )
    })
  ]
});

/**
 * 自定义错误类 - 应用错误
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode || 500;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // 标记为操作错误（非编程错误）
    
    // 记录操作错误
    logger.error(`${message} | Status: ${statusCode} | Operational: ${this.isOperational}`);
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 全局错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  // 设置默认状态码
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  // 生产环境：记录所有错误
  if (config.app.env === 'production') {
    logger.error(`[${req.method}] ${req.originalUrl} - ${err.message}`, {
      status: err.statusCode,
      stack: err.stack,
      body: req.body,
      query: req.query,
      params: req.params
    });
  }
  
  // 开发环境：返回详细错误信息
  if (config.app.env === 'development') {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      error: err,
      stack: err.stack
    });
  } 
  // 生产环境：返回简化错误信息
  else {
    // 操作错误（可预测的错误）
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    } 
    // 编程错误（未知错误） - 不泄露细节
    else {
      // 记录完整的错误信息
      logger.error(`严重错误: ${JSON.stringify(err, null, 2)}`);
      
      res.status(500).json({
        status: 'error',
        message: '发生意外错误，请稍后再试'
      });
    }
  }
};

/**
 * 错误处理工具函数
 */
const handleError = (err) => {
  // 如果是验证错误（例如Joi或Mongoose验证）
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `输入数据无效: ${errors.join('. ')}`;
    return new AppError(message, 400);
  }
  
  // 处理JWT错误
  if (err.name === 'JsonWebTokenError') {
    return new AppError('无效的令牌，请重新登录', 401);
  }
  
  if (err.name === 'TokenExpiredError') {
    return new AppError('令牌已过期，请重新登录', 401);
  }
  
  // 处理重复字段错误（MongoDB）
  if (err.code === 11000) {
    const value = err.keyValue ? Object.values(err.keyValue)[0] : '未知';
    const message = `${value} 已被使用，请尝试其他值`;
    return new AppError(message, 400);
  }
  
  // 处理CastError（无效ID格式）
  if (err.name === 'CastError') {
    const message = `无效的 ${err.path}: ${err.value}`;
    return new AppError(message, 400);
  }
  
  // 默认返回原始错误
  return err;
};

/**
 * 创建自定义错误
 */
const createError = (message, statusCode) => {
  return new AppError(message, statusCode);
};

/**
 * 异步错误捕获器（包装异步函数）
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(err => next(handleError(err)));
  };
};

/**
 * 404错误处理中间件
 */
const notFound = (req, res, next) => {
  const error = new AppError(`无法找到 ${req.originalUrl}`, 404);
  next(error);
};

module.exports = {
  errorHandler,    // 全局错误处理中间件
  catchAsync,      // 异步错误捕获器
  createError,     // 创建自定义错误
  notFound,        // 404处理中间件
  handleError,     // 错误处理工具
  AppError         // 自定义错误类
};