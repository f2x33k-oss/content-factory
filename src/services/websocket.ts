import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer;

export function setupWebSocket(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
    },
  });

  return io;
}

export function emitJobEvent(eventName: string, jobId: string, status: string) {
  if (io) {
    io.emit(eventName, { jobId, status });
  }
}
