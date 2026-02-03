import { Worker, Job } from 'bullmq';
import { prisma } from './config/database.js';
import { redisConnection } from './config/queue.js';
import { config } from './config/env.js';
import { logger } from './config/logger.js';
import { validateConfig } from './config/validator.js';
import { generateText } from './services/openai.js';
import { publishJobEvent } from './services/pubsub.js';

interface JobData {
  jobId: string;
  input: any;
}

// Validate configuration at startup
try {
  validateConfig();
  logger.info('Worker configuration validated');
} catch (error: any) {
  logger.error({ error: error.message }, 'Worker configuration validation failed');
  process.exit(1);
}

async function processJob(job: Job<JobData>): Promise<any> {
  const { jobId, input } = job.data;

  logger.info({ jobId }, 'Processing job');

  await prisma.job.update({
    where: { id: jobId },
    data: { status: 'processing' },
  });
  publishJobEvent(jobId, 'job.processing');

  try {
    const result = await generateText({ prompt: input.prompt || '' });

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        output: { content: result.text },
      },
    });
    publishJobEvent(jobId, 'job.completed');

    logger.info({ jobId }, 'Job completed');
    return result;

  } catch (error: any) {
    logger.error({ jobId, error: error.message }, 'Job failed');

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        error: error.message,
      },
    });
    publishJobEvent(jobId, 'job.failed');

    throw error;
  }
}

const worker = new Worker<JobData>(
  'content-factory-jobs',
  processJob,
  {
    connection: redisConnection,
    concurrency: config.workerConcurrency,
  }
);

worker.on('error', (error) => {
  logger.error({ error: error.message }, 'Worker error');
  process.exit(1);
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Worker unhandled rejection');
  process.exit(1);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error({ error: error.message, stack: error.stack }, 'Worker uncaught exception');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Worker shutting down gracefully');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Worker shutting down gracefully');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

logger.info({ concurrency: config.workerConcurrency }, 'Worker started');
