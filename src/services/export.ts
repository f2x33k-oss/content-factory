import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { logger } from '../config/logger.js';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function generateTextFile(album: any, recipes: any[]): Promise<string> {
  try {
    logger.info(`Generating text file for album: ${album.title}`);
    
    const tempDir = path.join(process.cwd(), 'temp');
    
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      logger.info('Creating temp directory');
      fs.mkdirSync(tempDir, { recursive: true });
    }

    let content = `═══════════════════════════════════════════
   ${album.title.toUpperCase()}
═══════════════════════════════════════════

Nombre de recettes : ${recipes.length}
Status : ${album.status}
Coût : $${album.cost || '0.00'}
Temps estimé : ${album.estimatedTime ? Math.ceil(album.estimatedTime / 60) + ' min' : 'N/A'}

`;

    recipes.forEach((recipe: any, index: number) => {
      content += `
───────────────────────────────────────────
RECETTE ${index + 1} : ${recipe.title || 'Sans titre'}
───────────────────────────────────────────

`;
      
      if (recipe.prepTime || recipe.cookTime) {
        content += `⏱️ Temps de préparation : ${recipe.prepTime || 'N/A'}\n`;
        content += `🔥 Temps de cuisson : ${recipe.cookTime || 'N/A'}\n\n`;
      }
      
      if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
        content += `INGRÉDIENTS :\n`;
        recipe.ingredients.forEach((ing: string) => {
          content += `• ${ing}\n`;
        });
        content += '\n';
      }
      
      if (recipe.steps && Array.isArray(recipe.steps)) {
        content += `ÉTAPES :\n`;
        recipe.steps.forEach((step: string, i: number) => {
          content += `${i + 1}. ${step}\n`;
        });
        content += '\n';
      }
      
      content += '\n';
    });

    const fileName = `${slugify(album.title)}.txt`;
    const filePath = path.join(tempDir, fileName);
    
    logger.info(`Writing text file to: ${filePath}`);
    fs.writeFileSync(filePath, content, 'utf-8');
    
    logger.info(`Text file generated successfully: ${fileName}`);
    return filePath;
    
  } catch (error: any) {
    logger.error('Error generating text file:', error);
    throw error;
  }
}

export async function generateImagesZip(album: any, recipes: any[]): Promise<string> {
  try {
    logger.info(`Generating images ZIP for album: ${album.title}`);
    
    const tempDir = path.join(process.cwd(), 'temp');
    
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      logger.info('Creating temp directory');
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const zipName = `${slugify(album.title)}.zip`;
    const zipPath = path.join(tempDir, zipName);
    
    logger.info(`Creating ZIP at: ${zipPath}`);
    
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', () => {
        logger.info(`ZIP created: ${archive.pointer()} total bytes`);
        resolve(zipPath);
      });
      
      archive.on('error', (err) => {
        logger.error('Archive error:', err);
        reject(err);
      });
      
      archive.pipe(output);
      
      let imagesAdded = 0;
      
      recipes.forEach((recipe: any, index: number) => {
        if (recipe.imageUrl) {
          const imagePath = path.join(process.cwd(), recipe.imageUrl.replace(/^\//, ''));
          
          if (fs.existsSync(imagePath)) {
            const fileName = `${index + 1}-${slugify(recipe.title || album.title)}.jpg`;
            logger.info(`Adding image to ZIP: ${fileName}`);
            archive.file(imagePath, { name: fileName });
            imagesAdded++;
          } else {
            logger.warn(`Image not found: ${imagePath}`);
          }
        }
      });
      
      if (imagesAdded === 0) {
        logger.warn('No images found to add to ZIP');
        archive.append('No images were generated for this album.', { 
          name: 'README.txt' 
        });
      }
      
      archive.finalize();
    });
    
  } catch (error: any) {
    logger.error('Error generating ZIP:', error);
    throw error;
  }
}

export function cleanupTempFile(filePath: string): void {
  setTimeout(() => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`Cleaned up temp file: ${filePath}`);
      }
    } catch (error: any) {
      logger.error('Error cleaning up temp file:', error);
    }
  }, 1000);
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
