import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export function useJobStatus(jobId: string | null) {
  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    if (!jobId) return;

    const newSocket = io('http://localhost:3000');
    
    newSocket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      newSocket.emit('subscribe', { jobId });
    });

    newSocket.on('job.processing', (data: any) => {
      console.log('📨 Job processing:', data);
    });

    newSocket.on('job.completed', (data: any) => {
      console.log('✅ Job completed:', data);
    });

    newSocket.on('job.failed', (data: any) => {
      console.log('❌ Job failed:', data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [jobId]);

  return socket;
}
