import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';
import { config } from './config/env.js';
import { prisma } from './config/database.js';
import { logger } from './config/logger.js';
import { validateConfig } from './config/validator.js';
import healthRouter from './routes/health.js';
import jobsRouter from './routes/jobs.js';
import authRouter from './routes/auth.js';
import albumsRouter from './routes/albums.js';
import { setupWebSocket } from './services/websocket.js';

// Validate configuration at startup
try {
  validateConfig();
  logger.info('Configuration validated');
} catch (error: any) {
  logger.error({ error: error.message }, 'Configuration validation failed');
  process.exit(1);
}

// Ensure required directories exist
['temp', 'storage', 'storage/images'].forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.info({ directory: dir }, 'Directory created');
  }
});

const app = express();
const httpServer = createServer(app);

// Setup WebSocket
setupWebSocket(httpServer);

// Middleware
app.use(express.json());

// CORS - MUST be before routes and other middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
});
app.use(limiter);

// Request logging
app.use((req, res, next) => {
  logger.info({ method: req.method, path: req.path }, 'Request');
  next();
});

// Serve static images
app.use('/storage', express.static('storage'));

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
app.use('/albums', albumsRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Content Factory API',
    version: '2.0.0',
    phase: 'V2 - Recipe Albums',
    endpoints: {
      health: '/health',
      auth: '/auth',
      jobs: '/jobs',
      albums: '/albums',
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
