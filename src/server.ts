import express from 'express';
import { config } from './config/env.js';
import { prisma } from './config/database.js';
import healthRouter from './routes/health.js';
import jobsRouter from './routes/jobs.js';

const app = express();

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
    phase: 'MVP - Phase 1',
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
app.listen(config.port, () => {
  console.log(`✅ Content Factory API running on http://localhost:${config.port}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
  console.log(`👤 Hardcoded User ID: ${config.defaultUserId}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});
