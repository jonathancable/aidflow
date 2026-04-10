// apps/api/src/middleware/security.middleware.ts
import rateLimit from "express-rate-limit";
import RedisStore, { type SendCommandFn } from "rate-limit-redis";
import IORedis from "ioredis";
import { env } from "@config/env";

const redis = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

// IORedis.call returns Promise<unknown>; cast bridges to rate-limit-redis's SendCommandFn
const sendCommand: SendCommandFn = (...args: string[]) =>
  redis.call(...(args as [string, ...string[]])) as ReturnType<SendCommandFn>;

const isTest = process.env.VITEST !== undefined;

// General API rate limit — 100 requests per minute per IP
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ sendCommand }),
  message: {
    success: false,
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests — please slow down",
      details: null,
    },
  },
  // Never rate-limit the health check; bypass entirely during integration tests
  skip: (req) => req.path === "/health" || isTest,
});

// Strict auth rate limit — 10 requests per minute per IP
// validate.doubleCount:false — intentionally layered on top of generalLimiter for auth routes
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ sendCommand }),
  validate: { singleCount: false },
  message: {
    success: false,
    error: {
      code: "RATE_LIMITED",
      message: "Too many authentication attempts",
      details: null,
    },
  },
  skip: () => isTest,
});
