import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { logger } from '../config/logger.js';

/**
 * Generate formatted text file from album recipes
 */
export async function generateTextFile(album: any, recipes: any[]): Promise<string> {
  try {
    let content = `═══════════════════════════════════════════\n`;
    content += `   ${album.title.toUpperCase()}\n`;
    content += `═══════════════════════════════════════════\n\n`;
    content += `Album de ${recipes.length} recettes\n\n`;

    recipes.forEach((recipe, index) => {
    content += `───────────────────────────────────────────\n`;
    content += `RECETTE ${index + 1} : ${recipe.title}\n`;
    content += `───────────────────────────────────────────\n\n`;

    // Temps
    if (recipe.prepTime || recipe.cookTime) {
      content += `⏱️  TEMPS :\n`;
      if (recipe.prepTime) content += `   Préparation : ${recipe.prepTime}\n`;
      if (recipe.cookTime) content += `   Cuisson : ${recipe.cookTime}\n`;
      content += `\n`;
    }

    // Ingrédients
    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
      content += `📝 INGRÉDIENTS :\n`;
      (recipe.ingredients as string[]).forEach(ing => {
        content += `   • ${ing}\n`;
      });
      content += `\n`;
    }

    // Étapes
    if (recipe.steps && Array.isArray(recipe.steps)) {
      content += `👨‍🍳 ÉTAPES :\n`;
      (recipe.steps as string[]).forEach((step, i) => {
        content += `   ${i + 1}. ${step}\n`;
      });
      content += `\n`;
    }

    content += `\n`;
  });

  content += `═══════════════════════════════════════════\n`;
  content += `Fin de l'album - ${recipes.length} recettes\n`;
  content += `═══════════════════════════════════════════\n`;

    // Create temp directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const fileName = `${slugify(album.title)}-${album.id.slice(0, 8)}.txt`;
    const filePath = path.join(tempDir, fileName);

    fs.writeFileSync(filePath, content, 'utf-8');

    logger.info({ albumId: album.id, filePath }, 'Text file generated');

    return filePath;
  } catch (error: any) {
    logger.error({ error: error.message, albumTitle: album?.title }, 'Failed to generate text file');
    throw error;
  }
}

/**
 * Generate ZIP archive of recipe images
 */
export async function generateImagesZip(album: any, recipes: any[]): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      logger.info({ albumId: album.id, recipeCount: recipes.length }, 'Starting ZIP generation');
      // Create temp directory
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const zipName = `${slugify(album.title)}-${album.id.slice(0, 8)}.zip`;
      const zipPath = path.join(tempDir, zipName);

      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', {
        zlib: { level: 9 },
      });

      output.on('close', () => {
        logger.info({ 
          albumId: album.id, 
          zipPath, 
          bytes: archive.pointer() 
        }, 'ZIP file generated');
        resolve(zipPath);
      });

      archive.on('error', (err) => {
        logger.error({ error: err.message, albumId: album.id }, 'Archive error');
        reject(err);
      });

      archive.pipe(output);

      let imageCount = 0;

      // Add each recipe image to the archive
      recipes.forEach((recipe) => {
        if (recipe.imageUrl) {
          // Convert URL path to actual filesystem path
          let imagePath = recipe.imageUrl;
          
          // If it's a relative path starting with /storage
          if (imagePath.startsWith('/storage')) {
            imagePath = path.join(process.cwd(), imagePath.replace(/^\//, ''));
          }

          logger.info({ recipeId: recipe.id, imagePath, exists: fs.existsSync(imagePath) }, 'Checking image file');

          // Check if file exists
          if (fs.existsSync(imagePath)) {
            const fileName = `${recipe.order}-${slugify(album.title)}.jpg`;
            archive.file(imagePath, { name: fileName });
            imageCount++;
            logger.info({ fileName, imagePath }, 'Image added to archive');
          } else {
            logger.warn({ recipeId: recipe.id, imagePath }, 'Image file not found, skipping');
          }
        }
      });

      logger.info({ albumId: album.id, imageCount }, 'Finalizing archive');
      archive.finalize();

    } catch (error: any) {
      logger.error({ error: error.message, albumId: album.id }, 'Failed to create ZIP');
      reject(error);
    }
  });
}

/**
 * Clean up temporary file
 */
export function cleanupTempFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info({ filePath }, 'Temp file cleaned up');
    }
  } catch (error: any) {
    logger.error({ error: error.message, filePath }, 'Failed to cleanup temp file');
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50);
}
