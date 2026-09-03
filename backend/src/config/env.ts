import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().transform((val) => parseInt(val, 10)).default('5001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  SUPABASE_URL: z.string().default('https://placeholder.supabase.co'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default('placeholder-service-role-key'),
  SUPABASE_STORAGE_BUCKET: z.string().default('datasets'),
  MAX_FILE_SIZE_BYTES: z.string().transform((val) => parseInt(val, 10)).default('52428800'), // 50MB
  ML_SERVICE_URL: z.string().default('http://localhost:8000'),
  ML_SERVICE_TIMEOUT_MS: z.string().transform((val) => parseInt(val, 10)).default('10000'), // 10s timeout
  RATE_LIMIT_WINDOW_MS: z.string().transform((val) => parseInt(val, 10)).default('900000'), // 15 mins
  RATE_LIMIT_MAX_REQUESTS: z.string().transform((val) => parseInt(val, 10)).default('100'), // 100 reqs per 15m
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
