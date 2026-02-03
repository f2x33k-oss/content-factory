import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(config.geminiApiKey);

export interface GeminiInput {
  prompt: string;
  model?: string;
}

export interface GeminiOutput {
  text: string;
  model: string;
}

/**
 * Generate text using Gemini API
 * TEMPORARY MOCK - Real Gemini API disabled for testing
 */
export async function generateText(input: GeminiInput): Promise<GeminiOutput> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Return mock response
  return {
    text: `Mock AI Response for prompt: "${input.prompt}"\n\nHere is some generated content:\n\n1. First item of generated content\n2. Second item of generated content\n3. Third item of generated content\n\n(This is a temporary mock response - real Gemini API will be enabled later)`,
    model: 'gemini-mock',
  };
  
  /* Real Gemini code (commented for testing):
  
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const modelName = input.model || 'gemini-1.5-pro';
  const model = genAI.getGenerativeModel({ model: modelName });

  const result = await model.generateContent(input.prompt);
  const response = result.response;
  const text = response.text();

  return {
    text,
    model: modelName,
  };
  */
}
