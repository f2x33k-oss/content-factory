import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import Redis from 'ioredis';
import { config } from '../config/env.js';

export function setupWebSocket(httpServer: HTTPServer) {
  // Create Socket.IO server
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
    },
  });

  // Create Redis subscriber for Pub/Sub
  const redisSubscriber = new Redis({
    host: config.redisHost,
    port: config.redisPort,
  });

  // Subscribe to job events channel
  redisSubscriber.subscribe('job-events');

  // Listen for Redis Pub/Sub messages
  redisSubscriber.on('message', (channel, message) => {
    if (channel === 'job-events') {
      const event = JSON.parse(message);
      // Broadcast to all clients subscribed to this jobId
      io.to(event.jobId).emit(event.status, event);
    }
  });

  // Handle client connections
  io.on('connection', (socket) => {
    // Client subscribes to a specific jobId
    socket.on('subscribe', (data: { jobId: string }) => {
      socket.join(data.jobId);
    });

    // Client unsubscribes from a jobId
    socket.on('unsubscribe', (data: { jobId: string }) => {
      socket.leave(data.jobId);
    });
  });

  return io;
}
