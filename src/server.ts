import express from 'express';
import { createServer } from 'http';
import rateLimit from 'express-rate-limit';
import Redis from 'ioredis';
import { config } from './config/env.js';
import { prisma } from './config/database.js';
import { logger } from './config/logger.js';
import { validateConfig } from './config/validator.js';
import healthRouter from './routes/health.js';
import jobsRouter from './routes/jobs.js';
import authRouter from './routes/auth.js';
import { setupWebSocket } from './services/websocket.js';

// Validate configuration at startup
try {
  validateConfig();
  logger.info('Configuration validated');
} catch (error: any) {
  logger.error({ error: error.message }, 'Configuration validation failed');
  process.exit(1);
}

const app = express();
const httpServer = createServer(app);

// Setup WebSocket
setupWebSocket(httpServer);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
});
app.use(limiter);

// Middleware
app.use(express.json());

// CORS
const allowedOrigins = config.nodeEnv === 'production' 
  ? ['https://yourdomain.com']
  : ['*'];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Request logging
app.use((req, res, next) => {
  logger.info({ method: req.method, path: req.path }, 'Request');
  next();
});

// Routes
app.use('/health', healthRouter);

// Readiness check
app.get('/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const redis = new Redis({
      host: config.redisHost,
      port: config.redisPort,
    });
    await redis.ping();
    await redis.quit();
    res.json({ status: 'ready' });
  } catch (error) {
    logger.error({ error }, 'Readiness check failed');
    res.status(503).json({ status: 'not ready' });
  }
});

app.use('/auth', authRouter);
app.use('/jobs', jobsRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Content Factory API',
    version: '1.0.0',
    phase: 'Phase 5',
    endpoints: {
      health: '/health',
      auth: '/auth',
      jobs: '/jobs',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({ 
    error: err.message, 
    stack: err.stack,
    method: req.method,
    path: req.path,
  }, 'Request error');
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Start server
httpServer.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, 'API started');
  logger.info('WebSocket ready');
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled rejection');
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error({ error: error.message, stack: error.stack }, 'Uncaught exception');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});
