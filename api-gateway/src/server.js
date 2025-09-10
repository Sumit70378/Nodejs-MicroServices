require('dotenv').config()
const express = require('express')
const cors = require('cors')
const Redis = require('ioredis')
const helmet = require('helmet')
const { rateLimit } = require('express-rate-limit')
const { RedisStore } = require('rate-limit-redis')
const logger = require('./utils/logger')
const proxy = require('express-http-proxy')
const { validateToken} = require('./middleware/authMiddleware')


const app = express()
const PORT = process.env.PORT || 3000

// ✅ Redis Client
const redisClient = new Redis(process.env.REDIS_URL)

// ✅ Security + Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())

// ✅ Rate Limiting with Redis Store
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`⚠️ Sensitive endpoint limit exceeded for IP: ${req.ip}`)
    res.status(429).json({ success: false, message: 'Too many requests' })
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
})

app.use(rateLimiter)

// ✅ Request Logging
app.use((req, res, next) => {
  logger.info(`➡️ ${req.method} ${req.url}`)
  if (req.body && Object.keys(req.body).length) {
    logger.info(`📦 Body: ${JSON.stringify(req.body)}`)
  }
  next()
})

/**
 * Proxy Setup:
 * - API Gateway listens on port 3000
 * - Identity service runs on port 3001
 * - Rewrite /v1/auth/* -> /api/auth/*
 * Example: /v1/auth/register -> http://localhost:3001/api/auth/register
 */
const proxyOptions = {
  proxyReqPathResolver: (req) => {
    return req.originalUrl.replace(/^\/v1/, '/api')
  },
  proxyErrorHandler: (err, res, next) => {
    logger.error(`Proxy error: ${err.message}`)
    res.status(500).json({
      message: 'Internal server error',
      error: err.message,
    })
  },
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers['Content-Type'] = 'application/json'
    return proxyReqOpts
  },
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    logger.info(
      `Response received from Identity service: ${proxyRes.statusCode}`
    )
    return proxyResData
  },
}

// ✅ Proxy for Identity Service
app.use('/v1/auth', proxy(process.env.IDENTITY_SERVICE_URL, proxyOptions))



// Proxy for post service
app.use('/v1/posts', validateToken, proxy(process.env.POST_SERVICE_URL, {
  ...proxyOptions,

  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers['Content-Type'] = 'application/json';

    if (srcReq.user && srcReq.user.userId) {
      proxyReqOpts.headers['x-user-id'] = srcReq.user.userId; // from auth middleware
    }

    return proxyReqOpts; // ✅ must return proxyReqOpts
  },

  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    logger.info(
      `Response received from Posts service: ${proxyRes.statusCode}`
    );
    return proxyResData;
  },
}));

// Proxy for Search service
app.use('/v1/search', validateToken, proxy(process.env.SEARCH_SERVICE_URL, {
  ...proxyOptions,

  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers['Content-Type'] = 'application/json';

    if (srcReq.user && srcReq.user.userId) {
      proxyReqOpts.headers['x-user-id'] = srcReq.user.userId; // from auth middleware
    }

    return proxyReqOpts; // ✅ must return proxyReqOpts
  },

  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    logger.info(
      `Response received from Search service: ${proxyRes.statusCode}`
    );
    return proxyResData;
  },
}));


//Proxy for Media-Service
app.use(
  '/v1/media',
  validateToken,
  proxy(process.env.MEDIA_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers['x-user-id'] = srcReq.user.userId;

      const contentType = srcReq.headers['content-type']; // correct way
      if (!contentType || !contentType.startsWith('multipart/form-data')) {
        proxyReqOpts.headers['Content-Type'] = 'application/json';
      }

      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from Media service: ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
    parseReqBody: false,
  })
);


// ✅ Error Handler
app.use((err, req, res, next) => {
  logger.error(`❌ ${err.stack}`)
  res.status(500).json({ success: false, message: 'Internal Server Error' })
})

// ✅ Start Server
app.listen(PORT, () => {
  logger.info(`🚀 API Gateway running on port ${PORT}`)
  logger.info(`🔗 Identity Service running on URL: ${process.env.IDENTITY_SERVICE_URL}`)
  logger.info(`🔗 Post Service running on URL: ${process.env.POST_SERVICE_URL}`)
  logger.info(`🔗 Media Service running on URL: ${process.env.MEDIA_SERVICE_URL}`)
  logger.info(`🔗 Search Service running on URL: ${process.env.SEARCH_SERVICE_URL}`)
  logger.info(`🔗 Redis URL: ${process.env.REDIS_URL}`)
})

// ✅ Handle Unhandled Rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at', promise, 'reason:', reason)
})
