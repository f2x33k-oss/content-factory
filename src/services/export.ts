import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { logger } from '../config/logger.js';

/**
 * Generate formatted text file from album recipes
 */
export async function generateTextFile(album: any, recipes: any[]): Promise<string> {
  try {
    console.log('[Export TXT] Generating text file for:', album.title);
    console.log('[Export TXT] Recipes to format:', recipes.length);

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
    console.log('[Export TXT] Temp dir:', tempDir);
    
    if (!fs.existsSync(tempDir)) {
      console.log('[Export TXT] Creating temp directory');
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const fileName = `${slugify(album.title)}-${album.id.slice(0, 8)}.txt`;
    const filePath = path.join(tempDir, fileName);
    
    console.log('[Export TXT] Writing file to:', filePath);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('[Export TXT] File written successfully');

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
      console.log('[Export ZIP] Starting ZIP generation for:', album.title);
      console.log('[Export ZIP] Recipes with images:', recipes.length);
      
      logger.info({ albumId: album.id, recipeCount: recipes.length }, 'Starting ZIP generation');
      
      // Create temp directory
      const tempDir = path.join(process.cwd(), 'temp');
      console.log('[Export ZIP] Temp dir:', tempDir);
      
      if (!fs.existsSync(tempDir)) {
        console.log('[Export ZIP] Creating temp directory');
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const zipName = `${slugify(album.title)}-${album.id.slice(0, 8)}.zip`;
      const zipPath = path.join(tempDir, zipName);
      console.log('[Export ZIP] ZIP path:', zipPath);

      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', {
        zlib: { level: 9 },
      });

      output.on('close', () => {
        console.log('[Export ZIP] Archive closed, bytes:', archive.pointer());
        logger.info({ 
          albumId: album.id, 
          zipPath, 
          bytes: archive.pointer() 
        }, 'ZIP file generated');
        resolve(zipPath);
      });

      output.on('error', (err) => {
        console.error('[Export ZIP] Output stream error:', err);
        reject(err);
      });

      archive.on('error', (err) => {
        console.error('[Export ZIP] Archive error:', err);
        logger.error({ error: err.message, albumId: album.id }, 'Archive error');
        reject(err);
      });

      archive.pipe(output);

      let imageCount = 0;

      // Add each recipe image to the archive
      recipes.forEach((recipe) => {
        console.log('[Export ZIP] Processing recipe:', recipe.order, recipe.title);
        
        if (recipe.imageUrl) {
          // Convert URL path to actual filesystem path
          let imagePath = recipe.imageUrl;
          
          // If it's a relative path starting with /storage
          if (imagePath.startsWith('/storage')) {
            imagePath = path.join(process.cwd(), imagePath.replace(/^\//, ''));
          }

          const exists = fs.existsSync(imagePath);
          console.log('[Export ZIP] Image path:', imagePath, 'exists:', exists);
          logger.info({ recipeId: recipe.id, imagePath, exists }, 'Checking image file');

          // Check if file exists
          if (exists) {
            const fileName = `${recipe.order}-${slugify(album.title)}.jpg`;
            archive.file(imagePath, { name: fileName });
            imageCount++;
            console.log('[Export ZIP] Image added:', fileName);
            logger.info({ fileName, imagePath }, 'Image added to archive');
          } else {
            console.warn('[Export ZIP] Image not found, skipping:', imagePath);
            logger.warn({ recipeId: recipe.id, imagePath }, 'Image file not found, skipping');
          }
        } else {
          console.log('[Export ZIP] No imageUrl for recipe:', recipe.order);
        }
      });

      console.log('[Export ZIP] Finalizing archive with', imageCount, 'images');
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
