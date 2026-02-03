import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  
  // Auth
  jwtSecret: process.env.JWT_SECRET || '',
  
  // Redis
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
  
  // AI APIs
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  sdxlApiUrl: process.env.SDXL_API_URL || '',
  sdxlApiKey: process.env.SDXL_API_KEY || '',
  
  // Worker
  workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY || '3', 10),
};
