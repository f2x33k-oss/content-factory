import express, { Response } from 'express';
import path from 'path';
import { prisma } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { logger } from '../config/logger.js';
import { jobQueue } from '../config/queue.js';
import { estimateAlbumGeneration } from '../services/recipe-generator.js';
import { generateTextFile, generateImagesZip, cleanupTempFile } from '../services/export.js';
import { z } from 'zod';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Validation schema
const createAlbumSchema = z.object({
  title: z.string().min(1),
  itemCount: z.number().min(1).max(100).optional(),
  imageApi: z.enum(['stability-ai', 'midjourney', 'replicate']).default('stability-ai'),
  textEnabled: z.boolean().default(true),
  referenceImages: z.array(z.string()).optional(),
});

// POST /albums - Create new album
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const input = createAlbumSchema.parse(req.body);
    
    // Extract item count from title if not provided
    let itemCount = input.itemCount;
    if (!itemCount) {
      const match = input.title.match(/(\d+)/);
      itemCount = match ? parseInt(match[0]) : 10;
    }

    // Calculate cost and time estimates
    const estimation = estimateAlbumGeneration(itemCount, input.textEnabled, true);

    // Create album with N recipe placeholders
    const album = await prisma.album.create({
      data: {
        userId: req.userId!,
        title: input.title,
        itemCount,
        imageApi: input.imageApi,
        textEnabled: input.textEnabled,
        status: 'pending',
        cost: estimation.cost,
        estimatedTime: estimation.estimatedTime,
        referenceImages: input.referenceImages || null,
        recipes: {
          create: Array.from({ length: itemCount }, (_, i) => ({
            order: i + 1,
            title: `Recipe ${i + 1}`,
            status: 'pending',
          })),
        },
      },
      include: {
        recipes: true,
      },
    });

    logger.info({ albumId: album.id, userId: req.userId, itemCount }, 'Album created');

    // Push album generation job to queue
    await jobQueue.add('recipe-album', {
      albumId: album.id,
      type: 'recipe_album',
    }, {
      jobId: album.id,
    });

    logger.info({ albumId: album.id }, 'Album job pushed to queue');

    res.status(201).json(album);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error({ error: error.message, userId: req.userId }, 'Failed to create album');
    res.status(500).json({ error: 'Failed to create album' });
  }
});

// GET /albums - List user's albums
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, limit = '50', offset = '0' } = req.query;

    const albums = await prisma.album.findMany({
      where: {
        userId: req.userId,
        ...(status && { status: status as string }),
      },
      include: {
        _count: {
          select: { recipes: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    });

    res.json(albums);
  } catch (error: any) {
    logger.error({ error: error.message, userId: req.userId }, 'Failed to fetch albums');
    res.status(500).json({ error: 'Failed to fetch albums' });
  }
});

// GET /albums/:id - Get album details with recipes
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const album = await prisma.album.findUnique({
      where: { id },
      include: {
        recipes: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }

    if (album.userId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(album);
  } catch (error: any) {
    logger.error({ error: error.message, userId: req.userId, albumId: req.params.id }, 'Failed to fetch album');
    res.status(500).json({ error: 'Failed to fetch album' });
  }
});

// GET /albums/:id/download/text - Download album as .txt file
router.get('/:id/download/text', async (req: AuthRequest, res: Response) => {
  let filePath: string | null = null;

  try {
    const { id } = req.params;
    console.log('[Download TXT] Requested for album:', id);

    const album = await prisma.album.findUnique({
      where: { id },
      include: {
        recipes: {
          orderBy: { order: 'asc' },
          where: { status: 'completed' },
        },
      },
    });

    console.log('[Download TXT] Album found:', album ? album.title : 'NULL');
    console.log('[Download TXT] Recipes count:', album?.recipes.length || 0);

    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }

    if (album.userId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (album.recipes.length === 0) {
      return res.status(400).json({ error: 'No recipes available for download' });
    }

    // Generate text file
    console.log('[Download TXT] Generating text file...');
    filePath = await generateTextFile(album, album.recipes);
    console.log('[Download TXT] File generated:', filePath);

    logger.info({ albumId: album.id, filePath }, 'Text file generated');

    // Send file
    res.download(filePath, path.basename(filePath), (err) => {
      if (err) {
        console.error('[Download TXT] Download error:', err);
        logger.error({ error: err.message, filePath }, 'Download error');
      }
      // Cleanup after download
      if (filePath) {
        setTimeout(() => cleanupTempFile(filePath!), 1000);
      }
    });

    logger.info({ albumId: album.id, userId: req.userId }, 'Album text downloaded');
  } catch (error: any) {
    console.error('[Download TXT] ERROR:', error);
    logger.error({ 
      error: error.message, 
      stack: error.stack,
      userId: req.userId, 
      albumId: req.params.id 
    }, 'Failed to download album text');
    
    // Cleanup on error
    if (filePath) {
      cleanupTempFile(filePath);
    }
    
    res.status(500).json({ error: error.message || 'Failed to download album' });
  }
});

// GET /albums/:id/download/images - Download album images as .zip
router.get('/:id/download/images', async (req: AuthRequest, res: Response) => {
  let zipPath: string | null = null;

  try {
    const { id } = req.params;
    console.log('[Download ZIP] Requested for album:', id);

    const album = await prisma.album.findUnique({
      where: { id },
      include: {
        recipes: {
          orderBy: { order: 'asc' },
          where: { 
            status: 'completed',
            imageUrl: { not: null },
          },
        },
      },
    });

    console.log('[Download ZIP] Album found:', album ? album.title : 'NULL');
    console.log('[Download ZIP] Recipes with images:', album?.recipes.length || 0);

    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }

    if (album.userId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (album.recipes.length === 0) {
      return res.status(400).json({ error: 'No images available for download' });
    }

    // Generate ZIP file
    console.log('[Download ZIP] Generating ZIP file...');
    zipPath = await generateImagesZip(album, album.recipes);
    console.log('[Download ZIP] ZIP generated:', zipPath);

    logger.info({ albumId: album.id, zipPath }, 'ZIP file generated');

    // Send file
    res.download(zipPath, path.basename(zipPath), (err) => {
      if (err) {
        console.error('[Download ZIP] Download error:', err);
        logger.error({ error: err.message, zipPath }, 'Download error');
      }
      // Cleanup after download
      if (zipPath) {
        setTimeout(() => cleanupTempFile(zipPath!), 1000);
      }
    });

    logger.info({ albumId: album.id, userId: req.userId }, 'Album images downloaded');
  } catch (error: any) {
    console.error('[Download ZIP] ERROR:', error);
    logger.error({ 
      error: error.message, 
      stack: error.stack,
      userId: req.userId, 
      albumId: req.params.id 
    }, 'Failed to download album images');
    
    // Cleanup on error
    if (zipPath) {
      cleanupTempFile(zipPath);
    }
    
    res.status(500).json({ error: error.message || 'Failed to download album images' });
  }
});

export default router;
