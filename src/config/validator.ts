import { config } from './env.js';

export function validateConfig() {
  const required = [
    { name: 'DATABASE_URL', value: config.databaseUrl },
    { name: 'JWT_SECRET', value: config.jwtSecret },
    { name: 'REDIS_HOST', value: config.redisHost },
    { name: 'GEMINI_API_KEY', value: config.geminiApiKey },
  ];

  const missing = required.filter(({ value }) => !value);

  if (missing.length > 0) {
    const missingNames = missing.map(({ name }) => name).join(', ');
    throw new Error(`Missing required environment variables: ${missingNames}`);
  }
}
