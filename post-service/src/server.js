require("dotenv").config(); // ✅ Added parentheses
const express = require("express");
const mongoose = require("mongoose");
const Redis = require("ioredis");
const cors = require("cors");
const helmet = require("helmet");
const postRoutes = require("./routes/post-routes");
const logger = require("./utils/logger"); // ✅ Fixed spelling of require
const { connectToRabbitMQ } = require("./utils/rabbitmq");

const app = express();
const PORT = process.env.PORT || 3002; // ✅ Corrected variable name (PORT)

// ✅ MongoDB Connection
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

// ✅ Routes (Inject Redis Client)
app.use(
  "/api/posts",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  postRoutes
);

// ✅ Error Handler
app.use((err, req, res, next) => {
  logger.error(`❌ ${err.stack}`);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});
//connection to rabbitmq
async function startServer() {
  try {
    await connectToRabbitMQ();
    app.listen(PORT, () => {
      logger.info(`🚀 Post service running on port ${PORT}`);
    });
  } catch (e) {
    logger.error("Failed to connect to server", e);
    process.exit(1);
  }
}

// ✅ Start Server
startServer();

// ✅ Handle Unhandled Rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at", promise, "reason:", reason);
});
