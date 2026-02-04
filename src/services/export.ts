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
    console.log('=== GENERATE TEXT FILE ===');
    console.log('Album:', album.title);
    console.log('Recipes:', recipes.length);
    
    const tempDir = path.join(process.cwd(), 'temp');
    console.log('Temp dir:', tempDir);
    
    if (!fs.existsSync(tempDir)) {
      console.log('Creating temp directory...');
      fs.mkdirSync(tempDir, { recursive: true });
    }

    let content = `═══════════════════════════════════════════
   ${album.title.toUpperCase()}
═══════════════════════════════════════════

Nombre de recettes : ${recipes.length}
Status : ${album.status}

`;

    recipes.forEach((recipe: any, index: number) => {
      console.log(`Adding recipe ${index + 1}: ${recipe.title}`);
      
      content += `
───────────────────────────────────────────
RECETTE ${index + 1} : ${recipe.title || 'Sans titre'}
───────────────────────────────────────────

`;
      
      if (recipe.prepTime || recipe.cookTime) {
        content += `⏱️ Préparation : ${recipe.prepTime || 'N/A'}\n`;
        content += `🔥 Cuisson : ${recipe.cookTime || 'N/A'}\n\n`;
      }
      
      if (recipe.ingredients) {
        content += `INGRÉDIENTS :\n`;
        const ingredients = Array.isArray(recipe.ingredients) 
          ? recipe.ingredients 
          : [];
        ingredients.forEach((ing: string) => {
          content += `• ${ing}\n`;
        });
        content += '\n';
      }
      
      if (recipe.steps) {
        content += `ÉTAPES :\n`;
        const steps = Array.isArray(recipe.steps) 
          ? recipe.steps 
          : [];
        steps.forEach((step: string, i: number) => {
          content += `${i + 1}. ${step}\n`;
        });
        content += '\n';
      }
    });

    const fileName = slugify(album.title) + '.txt';
    const filePath = path.join(tempDir, fileName);
    
    console.log('Writing to:', filePath);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('File written successfully');
    
    return filePath;
    
  } catch (error: any) {
    console.error('=== GENERATE TEXT FILE ERROR ===');
    console.error(error);
    throw error;
  }
}

export async function generateImagesZip(album: any, recipes: any[]): Promise<string> {
  try {
    console.log('=== GENERATE IMAGES ZIP ===');
    console.log('Album:', album.title);
    console.log('Recipes:', recipes.length);
    
    const tempDir = path.join(process.cwd(), 'temp');
    console.log('Temp dir:', tempDir);
    
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      console.log('Creating temp directory...');
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const zipName = slugify(album.title) + '.zip';
    const zipPath = path.join(tempDir, zipName);
    console.log('ZIP path:', zipPath);
    
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', () => {
        console.log('ZIP created:', archive.pointer(), 'total bytes');
        resolve(zipPath);
      });
      
      output.on('error', (err) => {
        console.error('Output stream error:', err);
        reject(err);
      });
      
      archive.on('error', (err) => {
        console.error('Archive error:', err);
        reject(err);
      });
      
      archive.pipe(output);
      
      let imagesAdded = 0;
      
      recipes.forEach((recipe: any, index: number) => {
        console.log(`Processing recipe ${index + 1}: ${recipe.title}`);
        
        if (recipe.imageUrl) {
          const imagePath = path.join(process.cwd(), recipe.imageUrl.replace(/^\//, ''));
          console.log('Image path:', imagePath);
          console.log('Exists:', fs.existsSync(imagePath));
          
          if (fs.existsSync(imagePath)) {
            const fileName = `${index + 1}-${slugify(recipe.title || album.title)}.jpg`;
            console.log('Adding to archive:', fileName);
            archive.file(imagePath, { name: fileName });
            imagesAdded++;
          } else {
            console.warn('Image not found:', imagePath);
          }
        } else {
          console.log('No imageUrl for recipe');
        }
      });
      
      console.log('Images added to archive:', imagesAdded);
      
      if (imagesAdded === 0) {
        console.log('No images found, adding placeholder README');
        archive.append('No images were generated for this album.', { 
          name: 'README.txt' 
        });
      }
      
      console.log('Finalizing archive...');
      archive.finalize();
    });
    
  } catch (error: any) {
    console.error('=== GENERATE ZIP ERROR ===');
    console.error(error);
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
