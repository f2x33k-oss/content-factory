import { Worker, Job } from 'bullmq';
import { prisma } from './config/database.js';
import { redisConnection } from './config/queue.js';
import { config } from './config/env.js';
import { generateText } from './services/gemini.js';

interface JobData {
  jobId: string;
  input: any;
}

async function processJob(job: Job<JobData>): Promise<any> {
  const { jobId, input } = job.data;

  await prisma.job.update({
    where: { id: jobId },
    data: { status: 'processing' },
  });

  try {
    const result = await generateText({ prompt: input.prompt || '' });

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        output: { content: result.text },
      },
    });

    return result;

  } catch (error: any) {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        error: error.message,
      },
    });

    throw error;
  }
}

const worker = new Worker<JobData>(
  'content-factory-jobs',
  processJob,
  {
    connection: redisConnection,
    concurrency: config.workerConcurrency,
  }
);

process.on('SIGINT', async () => {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

console.log('Worker started');
