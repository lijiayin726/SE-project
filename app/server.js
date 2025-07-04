// server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const connectDB = require('./config/db');
const { errorHandler, notFound } = require('./utils/errorHandler'); // 导入notFound
const config = require('./config/config');

// 连接数据库
connectDB();

const app = express();

// 中间件
app.use(express.json());
app.use(cors());

// 路由
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/challenges', require('./routes/challengeRoutes'));
app.use('/api/progress', require('./routes/progressRoutes'));
app.use('/api/social', require('./routes/socialRoutes'));

// 404处理（必须在所有路由之后，错误处理之前）
app.use(notFound);

// 全局错误处理中间件
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});