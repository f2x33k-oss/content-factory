import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer;

export function setupWebSocket(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
    },
  });

  io.on('connection', (socket) => {
    socket.on('subscribe', (data: { jobId: string }) => {
      socket.join(data.jobId);
    });

    socket.on('unsubscribe', (data: { jobId: string }) => {
      socket.leave(data.jobId);
    });
  });

  return io;
}

export function emitJobStatus(jobId: string, status: string) {
  if (io) {
    io.to(jobId).emit(status, { jobId, status });
  }
}
