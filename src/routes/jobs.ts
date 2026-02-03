import express, { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { config } from '../config/env.js';

const router = express.Router();

// Create a new job
router.post('/', async (req: Request, res: Response) => {
  try {
    const { type, input } = req.body;

    if (!type || !input) {
      return res.status(400).json({ error: 'Missing required fields: type, input' });
    }

    const job = await prisma.job.create({
      data: {
        userId: config.defaultUserId,
        type,
        status: 'pending',
        input,
        output: null,
      },
    });

    res.status(201).json(job);
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// Get all jobs for the user
router.get('/', async (req: Request, res: Response) => {
  try {
    const jobs = await prisma.job.findMany({
      where: {
        userId: config.defaultUserId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Get a specific job by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const job = await prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check if job belongs to the hardcoded user
    if (job.userId !== config.defaultUserId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// Update job status (manual for testing)
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, output, error } = req.body;

    const job = await prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.userId !== config.defaultUserId) {
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
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// Delete a job
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const job = await prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.userId !== config.defaultUserId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.job.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

export default router;
