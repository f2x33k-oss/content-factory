import { Worker, Job } from 'bullmq';
import { prisma } from './config/database.js';
import { redisConnection } from './config/queue.js';
import { config } from './config/env.js';
import { generateText } from './services/gemini.js';
import { generateImage } from './services/sdxl.js';

interface JobData {
  jobId: string;
  type: string;
  input: any;
}

async function processJob(job: Job<JobData>): Promise<any> {
  const { jobId, type, input } = job.data;

  console.log(`[Worker] Processing job ${jobId}`);

  // Update status to processing
  await prisma.job.update({
    where: { id: jobId },
    data: { status: 'processing' },
  });

  try {
    let result: any = {};

    // Execute based on type
    if (type === 'text_generation' || type === 'content_generation') {
      const geminiResult = await generateText({ prompt: input.prompt || '' });
      result = { content: geminiResult.text };
    } else if (type === 'image_generation') {
      const sdxlResult = await generateImage({ prompt: input.prompt || '' });
      result = { imageUrl: sdxlResult.imageUrl };
    }

    // Update job as completed
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        output: result,
      },
    });

    console.log(`[Worker] Job ${jobId} completed`);
    return result;

  } catch (error: any) {
    console.error(`[Worker] Job ${jobId} failed:`, error.message);

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

// Create worker with BullMQ defaults
const worker = new Worker<JobData>(
  'content-factory-jobs',
  processJob,
  {
    connection: redisConnection,
    concurrency: config.workerConcurrency,
  }
);

// Graceful shutdown
process.on('SIGINT', async () => {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

console.log('Worker started - waiting for jobs...');
