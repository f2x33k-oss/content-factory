import express from 'express';
import { createServer } from 'http';
import rateLimit from 'express-rate-limit';
import { config } from './config/env.js';
import { prisma } from './config/database.js';
import healthRouter from './routes/health.js';
import jobsRouter from './routes/jobs.js';
import authRouter from './routes/auth.js';
import { setupWebSocket } from './services/websocket.js';

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
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/health', healthRouter);
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
  console.error('[Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Start server
httpServer.listen(config.port, () => {
  console.log(`API running on http://localhost:${config.port}`);
  console.log(`WebSocket ready`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
