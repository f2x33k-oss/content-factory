import express, { Response } from 'express';
import { prisma } from '../config/database.js';
import { jobQueue } from '../config/queue.js';
import { emitJobEvent } from '../services/websocket.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { validate, createJobSchema } from '../middleware/validation.js';
import { logger } from '../config/logger.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Create a new job
router.post('/', validate(createJobSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { type, input } = req.body;

    // Create job in database
    const job = await prisma.job.create({
      data: {
        userId: req.userId!,
        type,
        status: 'pending',
        input,
        output: null,
      },
    });

    // Push job to queue for processing
    await jobQueue.add('process-job', {
      jobId: job.id,
      type: job.type,
      input: job.input,
    }, {
      jobId: job.id,
    });

    res.status(201).json(job);
  } catch (error: any) {
    logger.error({ error: error.message, userId: req.userId }, 'Failed to create job');
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// Get all jobs for the user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const jobs = await prisma.job.findMany({
      where: {
        userId: req.userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(jobs);

    jobs.forEach(job => {
      emitJobEvent('job.list', job.id, job.status);
    });
  } catch (error: any) {
    logger.error({ error: error.message, userId: req.userId }, 'Failed to fetch jobs');
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Get a specific job by ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const job = await prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.userId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(job);

    emitJobEvent('job.read', job.id, job.status);
  } catch (error: any) {
    logger.error({ error: error.message, userId: req.userId, jobId: id }, 'Failed to fetch job');
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// Update job status (manual for testing)
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, output, error } = req.body;

    const job = await prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.userId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updatedJob = await prisma.job.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(output && { output }),
        ...(error && { error }),
      },
    });

    res.json(updatedJob);
  } catch (error: any) {
    logger.error({ error: error.message, userId: req.userId, jobId: id }, 'Failed to update job');
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// Delete a job
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const job = await prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.userId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.job.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error: any) {
    logger.error({ error: error.message, userId: req.userId, jobId: id }, 'Failed to delete job');
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

export default router;
