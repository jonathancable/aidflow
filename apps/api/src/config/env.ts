import { z } from 'zod';
import 'dotenv/config';

const EnvSchema = z.object({
  NODE_ENV:             z.enum(['development', 'test', 'staging', 'production']),
  PORT:                 z.coerce.number().default(4000),
  DATABASE_URL:         z.string().url(),
  REDIS_URL:            z.string().url(),
  JWT_ACCESS_SECRET:    z.string().min(32),
  JWT_REFRESH_SECRET:   z.string().min(32),
  JWT_ACCESS_EXPIRES:   z.string().default('15m'),
  JWT_REFRESH_EXPIRES:  z.string().default('7d'),
  ENCRYPTION_KEY:       z.string().length(64), // 32 bytes hex-encoded
  CORS_ORIGINS:         z.string().default('http://localhost:5173'),
  // Feature flags
  ENABLE_BLOCKCHAIN_SYNC:    z.coerce.boolean().default(false),
  ENABLE_PAYMENT_GATEWAY:    z.coerce.boolean().default(false),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('FATAL: Invalid environment configuration:');
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env  = typeof env;