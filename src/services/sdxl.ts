import axios from 'axios';
import { config } from '../config/env.js';

export interface SDXLInput {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
}

export interface SDXLOutput {
  imageUrl: string;
  base64?: string;
  seed: number;
}

/**
 * Generate image using Stability AI SDXL API
 */
export async function generateImage(input: SDXLInput): Promise<SDXLOutput> {
  if (!config.sdxlApiKey) {
    throw new Error('SDXL_API_KEY is not configured');
  }

  if (!config.sdxlApiUrl) {
    throw new Error('SDXL_API_URL is not configured');
  }

  const response = await axios.post(
    config.sdxlApiUrl,
    {
      text_prompts: [
        {
          text: input.prompt,
          weight: 1,
        },
        ...(input.negativePrompt ? [{
          text: input.negativePrompt,
          weight: -1,
        }] : []),
      ],
      cfg_scale: 7,
      height: input.height || 1024,
      width: input.width || 1024,
      steps: input.steps || 30,
      samples: 1,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${config.sdxlApiKey}`,
      },
      timeout: 120000, // 2 minutes timeout
    }
  );

  const artifacts = response.data.artifacts;
  if (!artifacts || artifacts.length === 0) {
    throw new Error('No image generated');
  }

  const artifact = artifacts[0];

  return {
    imageUrl: `data:image/png;base64,${artifact.base64}`,
    base64: artifact.base64,
    seed: artifact.seed,
  };
}
