import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { redisSubscriber } from './pubsub.js';
import { logger } from '../config/logger.js';

let io: SocketIOServer;

export function setupWebSocket(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
    },
  });

  // Subscribe to Redis Pub/Sub channel
  redisSubscriber.subscribe('job-events', (err) => {
    if (err) {
      logger.error({ error: err.message }, 'Failed to subscribe to job-events');
    } else {
      logger.info('Subscribed to job-events channel');
    }
  });

  // Listen for Redis Pub/Sub messages
  redisSubscriber.on('message', (channel, message) => {
    if (channel === 'job-events') {
      try {
        const event = JSON.parse(message);
        const { jobId, status } = event;
        
        // Broadcast to all clients subscribed to this jobId
        io.to(jobId).emit(status, event);
        logger.info({ jobId, status }, 'Broadcasted event to WebSocket clients');
      } catch (error: any) {
        logger.error({ error: error.message, message }, 'Failed to parse Redis message');
      }
    }
  });

  // Handle client connections
  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'Client connected');

    // Client subscribes to a specific jobId
    socket.on('subscribe', (data: { jobId: string }) => {
      socket.join(data.jobId);
      logger.info({ socketId: socket.id, jobId: data.jobId }, 'Client subscribed to job');
    });

    // Client unsubscribes from a jobId
    socket.on('unsubscribe', (data: { jobId: string }) => {
      socket.leave(data.jobId);
      logger.info({ socketId: socket.id, jobId: data.jobId }, 'Client unsubscribed from job');
    });

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'Client disconnected');
    });
  });

  return io;
}

export function emitJobEvent(eventName: string, jobId: string, status: string) {
  if (io) {
    io.emit(eventName, { jobId, status });
  }
}
