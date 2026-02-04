import Redis from 'ioredis';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';

// Redis publisher for Pub/Sub (separate from queue)
export const redisPublisher = new Redis({
  host: config.redisHost,
  port: config.redisPort,
});

// Redis subscriber for Pub/Sub (separate from queue)
export const redisSubscriber = new Redis({
  host: config.redisHost,
  port: config.redisPort,
});

redisPublisher.on('error', (error) => {
  logger.error({ error: error.message }, 'Redis publisher error');
});

redisSubscriber.on('error', (error) => {
  logger.error({ error: error.message }, 'Redis subscriber error');
});

export function publishJobEvent(jobId: string, status: string) {
  const event = { jobId, status };
  redisPublisher.publish('job-events', JSON.stringify(event));
  logger.info({ jobId, status }, 'Published job event');
}
