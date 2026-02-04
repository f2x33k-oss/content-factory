import { Worker, Job } from 'bullmq';
import { prisma } from './config/database.js';
import { redisConnection } from './config/queue.js';
import { config } from './config/env.js';
import { logger } from './config/logger.js';
import { validateConfig } from './config/validator.js';
import { generateText } from './services/openai.js';
import { publishJobEvent } from './services/pubsub.js';

interface JobData {
  jobId?: string;
  albumId?: string;
  type?: string;
  input?: any;
}

// Validate configuration at startup
try {
  validateConfig();
  logger.info('Worker configuration validated');
} catch (error: any) {
  logger.error({ error: error.message }, 'Worker configuration validation failed');
  process.exit(1);
}

async function processJob(job: Job<JobData>): Promise<any> {
  const data = job.data;

  // Route to appropriate handler
  if (data.albumId) {
    return await processAlbumGeneration(data.albumId);
  } else if (data.jobId) {
    return await processLegacyJob(data.jobId, data.input);
  }

  throw new Error('Invalid job data');
}

async function processLegacyJob(jobId: string, input: any): Promise<any> {
  logger.info({ jobId }, 'Processing job');

  await prisma.job.update({
    where: { id: jobId },
    data: { status: 'processing' },
  });
  publishJobEvent(jobId, 'job.processing');

  try {
    const result = await generateText({ prompt: input.prompt || '' });

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        output: { content: result.text },
      },
    });
    publishJobEvent(jobId, 'job.completed');

    logger.info({ jobId }, 'Job completed');
    return result;

  } catch (error: any) {
    logger.error({ jobId, error: error.message }, 'Job failed');

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        error: error.message,
      },
    });
    publishJobEvent(jobId, 'job.failed');

    throw error;
  }
}

async function processAlbumGeneration(albumId: string): Promise<any> {
  logger.info({ albumId }, 'Processing album generation');

  const startTime = Date.now();

  try {
    // Fetch album with recipes
    const album = await prisma.album.findUnique({
      where: { id: albumId },
      include: { recipes: { orderBy: { order: 'asc' } } },
    });

    if (!album) {
      throw new Error('Album not found');
    }

    // Update album status to processing
    await prisma.album.update({
      where: { id: albumId },
      data: { status: 'processing' },
    });

    // Process each recipe
    for (const recipe of album.recipes) {
      try {
        logger.info({ albumId, recipeId: recipe.id, order: recipe.order }, 'Processing recipe');

        // Update recipe status
        await prisma.recipe.update({
          where: { id: recipe.id },
          data: { status: 'processing' },
        });

        // 1. Generate recipe text via ChatGPT
        const prompt = `Écris une recette à partir de : ${album.title}

Cette recette est la numéro ${recipe.order} de l'album.

Format JSON strict:
{
  "title": "titre court de la recette",
  "prepTime": "15 min",
  "cookTime": "30 min",
  "ingredients": ["ingrédient 1", "ingrédient 2", "ingrédient 3"],
  "steps": ["étape 1", "étape 2", "étape 3"]
}

Réponds UNIQUEMENT avec le JSON, rien d'autre.`;

        const textResult = await generateText({ prompt });
        
        // Parse JSON response
        let recipeData;
        try {
          const cleanedText = textResult.text.replace(/```json|```/g, '').trim();
          recipeData = JSON.parse(cleanedText);
        } catch (parseError) {
          // If JSON parsing fails, extract what we can
          recipeData = {
            title: `Recipe ${recipe.order}`,
            prepTime: '15 min',
            cookTime: '30 min',
            ingredients: ['Generated content parsing failed'],
            steps: [textResult.text],
          };
        }

        // 2. Generate image (placeholder for now)
        const imageUrl = `https://via.placeholder.com/512x512.png?text=Recipe+${recipe.order}`;

        // 3. Update recipe with results
        await prisma.recipe.update({
          where: { id: recipe.id },
          data: {
            title: recipeData.title,
            ingredients: recipeData.ingredients,
            steps: recipeData.steps,
            prepTime: recipeData.prepTime,
            cookTime: recipeData.cookTime,
            imageUrl,
            status: 'completed',
          },
        });

        logger.info({ albumId, recipeId: recipe.id, order: recipe.order }, 'Recipe completed');

      } catch (error: any) {
        logger.error({ albumId, recipeId: recipe.id, error: error.message }, 'Recipe failed');
        
        await prisma.recipe.update({
          where: { id: recipe.id },
          data: {
            status: 'failed',
            error: error.message,
          },
        });
      }
    }

    // Calculate actual time
    const actualTime = Math.floor((Date.now() - startTime) / 1000);

    // Mark album as completed
    await prisma.album.update({
      where: { id: albumId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        actualTime,
      },
    });

    logger.info({ albumId, actualTime }, 'Album generation completed');

    return { albumId, status: 'completed' };

  } catch (error: any) {
    logger.error({ albumId, error: error.message }, 'Album generation failed');

    await prisma.album.update({
      where: { id: albumId },
      data: {
        status: 'failed',
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

worker.on('error', (error) => {
  logger.error({ error: error.message }, 'Worker error');
  process.exit(1);
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Worker unhandled rejection');
  process.exit(1);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error({ error: error.message, stack: error.stack }, 'Worker uncaught exception');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Worker shutting down gracefully');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Worker shutting down gracefully');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

logger.info({ concurrency: config.workerConcurrency }, 'Worker started');
