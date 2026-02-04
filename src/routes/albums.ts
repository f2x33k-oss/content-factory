import express, { Response } from 'express';
import { prisma } from '../config/database.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { logger } from '../config/logger.js';
import { jobQueue } from '../config/queue.js';
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

    // Create album with N recipe placeholders
    const album = await prisma.album.create({
      data: {
        userId: req.userId!,
        title: input.title,
        itemCount,
        imageApi: input.imageApi,
        textEnabled: input.textEnabled,
        status: 'pending',
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
  try {
    const { id } = req.params;

    const album = await prisma.album.findUnique({
      where: { id },
      include: {
        recipes: {
          orderBy: { order: 'asc' },
          where: { status: 'completed' },
        },
      },
    });

    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }

    if (album.userId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (album.recipes.length === 0) {
      return res.status(400).json({ error: 'No recipes available for download' });
    }

    // Generate text content
    let content = `═══════════════════════════════════════════\n`;
    content += `   ${album.title.toUpperCase()}\n`;
    content += `═══════════════════════════════════════════\n\n`;

    album.recipes.forEach((recipe, index) => {
      content += `───────────────────────────────────────────\n`;
      content += `RECETTE ${index + 1} : ${recipe.title}\n`;
      content += `───────────────────────────────────────────\n\n`;

      if (recipe.prepTime || recipe.cookTime) {
        content += `⏱️ TEMPS :\n`;
        if (recipe.prepTime) content += `  Préparation : ${recipe.prepTime}\n`;
        if (recipe.cookTime) content += `  Cuisson : ${recipe.cookTime}\n`;
        content += `\n`;
      }

      if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
        content += `📝 INGRÉDIENTS :\n`;
        (recipe.ingredients as string[]).forEach(ing => {
          content += `  • ${ing}\n`;
        });
        content += `\n`;
      }

      if (recipe.steps && Array.isArray(recipe.steps)) {
        content += `👨‍🍳 ÉTAPES :\n`;
        (recipe.steps as string[]).forEach((step, i) => {
          content += `  ${i + 1}. ${step}\n`;
        });
        content += `\n`;
      }

      content += `\n`;
    });

    const fileName = slugify(album.title) + '.txt';
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(content);

    logger.info({ albumId: album.id, userId: req.userId }, 'Album text downloaded');
  } catch (error: any) {
    logger.error({ error: error.message, userId: req.userId, albumId: req.params.id }, 'Failed to download album text');
    res.status(500).json({ error: 'Failed to download album' });
  }
});

// GET /albums/:id/download/images - Download album images as .zip
router.get('/:id/download/images', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

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

    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }

    if (album.userId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (album.recipes.length === 0) {
      return res.status(400).json({ error: 'No images available for download' });
    }

    // For now, return JSON with image URLs
    // TODO: Implement actual ZIP generation with archiver in Phase 6
    res.json({
      albumId: album.id,
      title: album.title,
      images: album.recipes.map(recipe => ({
        order: recipe.order,
        title: recipe.title,
        imageUrl: recipe.imageUrl,
        fileName: `${recipe.order}-${slugify(album.title)}.jpg`,
      })),
      note: 'ZIP generation will be implemented in Phase 6',
    });

    logger.info({ albumId: album.id, userId: req.userId }, 'Album images requested');
  } catch (error: any) {
    logger.error({ error: error.message, userId: req.userId, albumId: req.params.id }, 'Failed to download album images');
    res.status(500).json({ error: 'Failed to download album images' });
  }
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default router;
