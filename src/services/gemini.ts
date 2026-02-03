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
 */
export async function generateText(input: GeminiInput): Promise<GeminiOutput> {
  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const modelName = input.model || 'gemini-pro';
  const model = genAI.getGenerativeModel({ model: modelName });

  const result = await model.generateContent(input.prompt);
  const response = result.response;
  const text = response.text();

  return {
    text,
    model: modelName,
  };
}
