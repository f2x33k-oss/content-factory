import express from 'express';
import { createServer } from 'http';
import { config } from './config/env.js';
import { prisma } from './config/database.js';
import healthRouter from './routes/health.js';
import jobsRouter from './routes/jobs.js';
import { setupWebSocket } from './services/websocket.js';

const app = express();
const httpServer = createServer(app);

// Setup WebSocket
setupWebSocket(httpServer);

// Middleware
app.use(express.json());

// Request logging (minimal)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/health', healthRouter);
app.use('/jobs', jobsRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Content Factory API',
    version: '0.1.0',
    phase: 'Phase 3',
    endpoints: {
      health: '/health',
      jobs: '/jobs',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
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
