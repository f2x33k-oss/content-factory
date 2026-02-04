import { Queue } from 'bullmq';
import { config } from './env.js';

// Redis connection config
export const redisConnection = {
  host: config.redisHost,
  port: config.redisPort,
};

// Job queue with BullMQ defaults
export const jobQueue = new Queue('content-factory-jobs', {
  connection: redisConnection,
});
