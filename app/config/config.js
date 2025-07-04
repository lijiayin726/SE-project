// config/config.js
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 应用配置
module.exports = {
  // 应用基本信息
  app: {
    name: process.env.APP_NAME || '自律挑战APP',
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
    apiVersion: process.env.API_VERSION || 'v1',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
  },
  
  // 数据库配置
  database: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/self_discipline_app',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
      poolSize: 10, // 连接池大小
      connectTimeoutMS: 30000, // 连接超时时间
    },
  },
  
  // 认证配置
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'your_default_secret',
    jwtExpiration: process.env.JWT_EXPIRATION || '7d' // 令牌有效期
  },
  
  // 文件存储配置
  storage: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif'],
    uploadPath: process.env.UPLOAD_PATH || 'uploads/',
    s3: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
      bucketName: process.env.AWS_S3_BUCKET,
    }
  },
  
  // 邮件服务配置
  email: {
    service: process.env.EMAIL_SERVICE || 'Gmail',
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE || false, // true for 465, false for other ports
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM || 'no-reply@self-discipline-app.com',
  },
  
  // 通知服务配置
  notifications: {
    push: {
      enabled: process.env.PUSH_NOTIFICATIONS_ENABLED === 'true',
      apiKey: process.env.PUSH_API_KEY,
    },
    sms: {
      enabled: process.env.SMS_NOTIFICATIONS_ENABLED === 'true',
      provider: process.env.SMS_PROVIDER || 'twilio',
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        fromNumber: process.env.TWILIO_FROM_NUMBER,
      }
    }
  },
  
  // 积分系统配置
  points: {
    challengeCompletion: process.env.POINTS_CHALLENGE_COMPLETION || 50,
    dailyStreak: process.env.POINTS_DAILY_STREAK || 10,
    socialWin: process.env.POINTS_SOCIAL_WIN || 100,
    referral: process.env.POINTS_REFERRAL || 20,
  },
  
  // AI服务配置
  ai: {
    enabled: process.env.AI_ENABLED === 'true',
    modelPath: process.env.AI_MODEL_PATH || 'models/habit_prediction.h5',
    trainingInterval: process.env.AI_TRAINING_INTERVAL || 'weekly', // daily, weekly, monthly
  },
  
  // 定时任务配置
  cron: {
    reminderCheck: process.env.CRON_REMINDER_CHECK || '*/5 * * * *', // 每5分钟
    dailyReport: process.env.CRON_DAILY_REPORT || '0 8 * * *', // 每天8点
    weeklyReport: process.env.CRON_WEEKLY_REPORT || '0 9 * * 1', // 每周一9点
    aiTraining: process.env.CRON_AI_TRAINING || '0 3 * * 0', // 每周日3点
  },
  
  // 调试与日志配置
  debug: {
    logLevel: process.env.LOG_LEVEL || 'debug', // error, warn, info, debug
    logRequests: process.env.LOG_REQUESTS === 'true',
    logDatabase: process.env.LOG_DATABASE === 'true',
  },
  
  // CORS配置
  cors: {
    allowedOrigins: process.env.CORS_ALLOWED_ORIGINS 
      ? process.env.CORS_ALLOWED_ORIGINS.split(',') 
      : ['http://localhost:3000', 'http://localhost:5000'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  
  // 速率限制配置
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15分钟
    maxRequests: process.env.RATE_LIMIT_MAX || 100, // 每个IP每窗口最大请求数
  },
  
  // 环境检测函数
  isProduction: () => process.env.NODE_ENV === 'production',
  isDevelopment: () => process.env.NODE_ENV === 'development',
  isTest: () => process.env.NODE_ENV === 'test',
  
  // 获取当前配置信息（用于调试）
  getConfig: function() {
    return {
      app: this.app,
      database: { uri: this.database.uri },
      auth: { 
        jwtExpiration: this.auth.jwtExpiration,
        oauth: { 
          google: !!this.auth.oauth.google.clientId,
          wechat: !!this.auth.oauth.wechat.appId
        }
      },
      storage: { maxFileSize: this.storage.maxFileSize },
      notifications: {
        push: { enabled: this.notifications.push.enabled },
        sms: { enabled: this.notifications.sms.enabled }
      },
      ai: { enabled: this.ai.enabled },
      debug: { logLevel: this.debug.logLevel }
    };
  }
};