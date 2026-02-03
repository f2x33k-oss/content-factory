import { Queue } from 'bullmq';
import { config } from './env.js';

// Redis connection config
export const redisConnection = {
  host: config.redisHost,
  port: config.redisPort,
};

// Job queue
export const jobQueue = new Queue('content-factory-jobs', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100,
      age: 24 * 3600, // 24 hours
    },
    removeOnFail: {
      count: 500,
      age: 7 * 24 * 3600, // 7 days
    },
  },
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await jobQueue.close();
});
