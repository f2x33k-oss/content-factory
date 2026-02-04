import OpenAI from 'openai';
import { config } from '../config/env.js';

export async function generateText(input: { prompt: string }) {
  if (!config.openaiApiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const openai = new OpenAI({
    apiKey: config.openaiApiKey,
  });

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: input.prompt }],
  });

  return {
    text: completion.choices[0].message.content || '',
  };
}
