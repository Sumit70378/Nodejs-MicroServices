require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const { RateLimiterRedis } = require("rate-limiter-flexible");
const rateLimit = require("express-rate-limit");
const Redis = require("ioredis");

const logger = require("./src/utils/logger");
const routes = require("./src/routes/identity-service");
const { RedisStore } = require("connect-redis");

const app = express();
const PORT = process.env.PORT || 5050;

// ✅ Load environment variables
const MONGO_URI = process.env.MONGO_URL || "mongodb://Admin:Password@mongo:27017/formDB?authSource=admin";
const REDIS_HOST = process.env.REDIS_HOST || "redis-stack";
const REDIS_PORT = process.env.REDIS_PORT || 6379;

// MongoDB Connection
mongoose.connect("mongodb://Admin:Password@mongo:27017/formDB?authSource=admin")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// Redis Connection
const redisClient = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT
});

redisClient.on("connect", () => console.log("✅ Connected to Redis"));
redisClient.on("error", (err) => console.error("❌ Redis error:", err));


// ✅ Middleware
app.use(helmet());
app.use(cors({ origin: "*", methods: "GET,POST,PUT,DELETE" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ✅ Request Logging
app.use((req, res, next) => {
  logger.info(`➡️ ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length) {
    logger.info(`📦 Body: ${JSON.stringify(req.body)}`);
  }
  next();
});

// ✅ Global Rate Limiter (DDoS Protection)
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware",
  points: 10, // 10 requests
  duration: 1, // per second
});

app.use(async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch {
    logger.warn(`⚠️ Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ success: false, message: "Too many requests" });
  }
});

// ✅ Sensitive Endpoint Rate Limiter (e.g., Register/Login)
const sensitiveEndpointsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`⚠️ Sensitive endpoint limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ success: false, message: "Too many requests" });
  }
});

// Apply on specific routes
app.use("/api/auth", sensitiveEndpointsLimiter);
app.use("/api/auth/login", sensitiveEndpointsLimiter);

// ✅ Routes
app.use("/api/auth", routes);

// ✅ Error Handler
app.use((err, req, res, next) => {
  logger.error(`❌ ${err.stack}`);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});

// ✅ Start Server
app.listen(PORT, () => {
  logger.info(`🚀 Identity service running on port ${PORT}`);
});

// ✅ Handle Unhandled Rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at", promise, "reason:", reason);
});



