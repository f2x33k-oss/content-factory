import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const API_URL = 'http://localhost:3000';

interface JobStatusEvent {
  jobId: string;
  status: string;
}

export function useJobStatus(jobId: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [lastEvent, setLastEvent] = useState<JobStatusEvent | null>(null);

  useEffect(() => {
    // Connect to WebSocket
    const newSocket = io(API_URL);

    newSocket.on('connect', () => {
      // Subscribe to job updates
      newSocket.emit('subscribe', { jobId });
    });

    // Listen for job events
    newSocket.on('job.processing', (data: JobStatusEvent) => {
      setLastEvent(data);
    });

    newSocket.on('job.completed', (data: JobStatusEvent) => {
      setLastEvent(data);
    });

    newSocket.on('job.failed', (data: JobStatusEvent) => {
      setLastEvent(data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('unsubscribe', { jobId });
      newSocket.disconnect();
    };
  }, [jobId]);

  return { socket, lastEvent };
}
