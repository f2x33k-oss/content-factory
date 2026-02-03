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

/**
 * Process a single job based on its type
 */
async function processJob(job: Job<JobData>): Promise<any> {
  const { jobId, type, input } = job.data;

  console.log(`[Worker] Processing job ${jobId} of type "${type}"`);

  // Update status to processing
  await prisma.job.update({
    where: { id: jobId },
    data: { status: 'processing' },
  });

  let result: any;

  try {
    // Route to appropriate handler based on job type
    switch (type) {
      case 'text_generation':
      case 'content_generation':
        result = await handleTextGeneration(input);
        break;

      case 'image_generation':
        result = await handleImageGeneration(input);
        break;

      default:
        throw new Error(`Unknown job type: ${type}`);
    }

    // Update job as completed
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        output: result,
        error: null,
      },
    });

    console.log(`[Worker] Job ${jobId} completed successfully`);
    return result;

  } catch (error: any) {
    console.error(`[Worker] Job ${jobId} failed:`, error.message);

    // Update job as failed
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        error: error.message || 'Unknown error',
      },
    });

    throw error;
  }
}

/**
 * Handle text generation using Gemini
 */
async function handleTextGeneration(input: any): Promise<any> {
  const prompt = input.prompt || input.title || '';
  const items = input.items || 1;

  if (!prompt) {
    throw new Error('Missing prompt for text generation');
  }

  // Generate content using Gemini
  const fullPrompt = items > 1 
    ? `Generate ${items} items about: ${prompt}`
    : prompt;

  const geminiResult = await generateText({ prompt: fullPrompt });

  return {
    type: 'text',
    prompt,
    items,
    content: geminiResult.text,
    model: geminiResult.model,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Handle image generation using SDXL
 */
async function handleImageGeneration(input: any): Promise<any> {
  const prompt = input.prompt || '';
  const negativePrompt = input.negativePrompt;
  const width = input.width;
  const height = input.height;
  const steps = input.steps;

  if (!prompt) {
    throw new Error('Missing prompt for image generation');
  }

  const sdxlResult = await generateImage({
    prompt,
    negativePrompt,
    width,
    height,
    steps,
  });

  return {
    type: 'image',
    prompt,
    imageUrl: sdxlResult.imageUrl,
    seed: sdxlResult.seed,
    generatedAt: new Date().toISOString(),
  };
}

// Create worker
const worker = new Worker<JobData>(
  'content-factory-jobs',
  processJob,
  {
    connection: redisConnection,
    concurrency: config.workerConcurrency,
    limiter: {
      max: 10,
      duration: 60000, // 10 jobs per minute max
    },
  }
);

// Worker event handlers
worker.on('completed', (job) => {
  console.log(`[Worker] ✅ Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] ❌ Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('[Worker] Worker error:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Worker] Shutting down gracefully...');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[Worker] Shutting down gracefully...');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

console.log('🚀 Worker started');
console.log(`📊 Concurrency: ${config.workerConcurrency} jobs`);
console.log(`🔗 Redis: ${config.redisHost}:${config.redisPort}`);
console.log('⏳ Waiting for jobs...\n');
