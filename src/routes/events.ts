import express, { Request, Response } from 'express';
import { emitJobStatus } from '../services/websocket.js';

const router = express.Router();

router.post('/', (req: Request, res: Response) => {
  const { jobId, status } = req.body;

  if (!jobId || !status) {
    return res.status(400).json({ error: 'Missing jobId or status' });
  }

  emitJobStatus(jobId, status);
  res.json({ ok: true });
});

export default router;
