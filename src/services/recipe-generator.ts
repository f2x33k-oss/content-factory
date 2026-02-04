import { generateText } from './openai.js';
import { logger } from '../config/logger.js';

export interface RecipeData {
  title: string;
  prepTime: string;
  cookTime: string;
  ingredients: string[];
  steps: string[];
}

export interface RecipeGenerationOptions {
  albumTitle: string;
  recipeNumber: number;
  language?: string;
  style?: string;
}

/**
 * Generate recipe text via ChatGPT with structured JSON output
 */
export async function generateRecipeText(options: RecipeGenerationOptions): Promise<RecipeData> {
  const { albumTitle, recipeNumber, language = 'français', style = 'traditionnel' } = options;

  const prompt = buildRecipePrompt(albumTitle, recipeNumber, language, style);

  try {
    const result = await generateText({ prompt });
    const recipeData = parseRecipeJSON(result.text);
    
    logger.info({ 
      albumTitle, 
      recipeNumber, 
      title: recipeData.title 
    }, 'Recipe text generated');

    return recipeData;

  } catch (error: any) {
    logger.error({ 
      albumTitle, 
      recipeNumber, 
      error: error.message 
    }, 'Failed to generate recipe text');
    throw error;
  }
}

/**
 * Build structured prompt for recipe generation
 */
function buildRecipePrompt(
  albumTitle: string, 
  recipeNumber: number, 
  language: string, 
  style: string
): string {
  return `Tu es un chef cuisinier professionnel. Crée une recette ${style} à partir de ce thème : "${albumTitle}"

Cette recette est la numéro ${recipeNumber} de l'album.

RÈGLES IMPORTANTES :
- Écris en ${language}
- Sois créatif et original
- Utilise des ingrédients accessibles
- Étapes claires et précises
- Temps de préparation et cuisson réalistes

Format de réponse STRICT (JSON uniquement) :
{
  "title": "Titre court et accrocheur de la recette",
  "prepTime": "15 min",
  "cookTime": "30 min",
  "ingredients": [
    "ingrédient 1 avec quantité",
    "ingrédient 2 avec quantité",
    "ingrédient 3 avec quantité"
  ],
  "steps": [
    "étape 1 détaillée",
    "étape 2 détaillée",
    "étape 3 détaillée"
  ]
}

RÉPONDS UNIQUEMENT AVEC LE JSON. Rien d'autre. Pas de texte avant ou après.`;
}

/**
 * Parse JSON response from ChatGPT
 * Handles various edge cases and formatting issues
 */
function parseRecipeJSON(text: string): RecipeData {
  try {
    // Clean up common formatting issues
    let cleanedText = text.trim();
    
    // Remove markdown code blocks if present
    cleanedText = cleanedText.replace(/```json\s*/g, '');
    cleanedText = cleanedText.replace(/```\s*/g, '');
    
    // Remove any leading/trailing whitespace
    cleanedText = cleanedText.trim();

    const parsed = JSON.parse(cleanedText);

    // Validate structure
    if (!parsed.title || !parsed.ingredients || !parsed.steps) {
      throw new Error('Missing required fields in recipe JSON');
    }

    return {
      title: parsed.title,
      prepTime: parsed.prepTime || '15 min',
      cookTime: parsed.cookTime || '30 min',
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
      steps: Array.isArray(parsed.steps) ? parsed.steps : [],
    };

  } catch (error: any) {
    logger.error({ error: error.message, text }, 'Failed to parse recipe JSON');
    
    // Fallback: return basic structure
    return {
      title: 'Recipe (parsing failed)',
      prepTime: '15 min',
      cookTime: '30 min',
      ingredients: ['Content generation failed - see raw text'],
      steps: [text],
    };
  }
}

/**
 * Estimate cost and time for album generation
 */
export function estimateAlbumGeneration(itemCount: number, textEnabled: boolean, imageEnabled: boolean) {
  const costPerText = 0.02; // $0.02 per recipe text (ChatGPT)
  const costPerImage = 0.10; // $0.10 per image (Stability AI)
  const timePerText = 10; // 10 seconds per recipe text
  const timePerImage = 20; // 20 seconds per image

  let totalCost = 0;
  let totalTime = 0;

  if (textEnabled) {
    totalCost += itemCount * costPerText;
    totalTime += itemCount * timePerText;
  }

  if (imageEnabled) {
    totalCost += itemCount * costPerImage;
    totalTime += itemCount * timePerImage;
  }

  return {
    cost: parseFloat(totalCost.toFixed(2)),
    estimatedTime: totalTime, // in seconds
    estimatedMinutes: Math.ceil(totalTime / 60),
  };
}
