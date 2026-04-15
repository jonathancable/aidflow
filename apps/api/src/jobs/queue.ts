// apps/api/src/jobs/queue.ts
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "@config/env";

// Shared Redis connection for all queues
export const redisConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
});

// ── Queue definitions ────────────────────────────────────────────
export const notificationQueue = new Queue("notifications", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 100, // keep last 100 completed jobs
    removeOnFail: 50, // keep last 50 failed jobs
  },
});

export const reportQueue = new Queue("reports", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "fixed", delay: 5000 },
    removeOnComplete: 20,
    removeOnFail: 20,
  },
});

export const reconciliationQueue = new Queue("reconciliation", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: 10,
    removeOnFail: 10,
  },
});

// ── Job type registry ────────────────────────────────────────────
export type NotificationJobData = {
  recipientId: string;
  eventType: string;
  payload: Record<string, unknown>;
};

export type ReportJobData = {
  reportType: string;
  requestedBy: string;
  filters: Record<string, unknown>;
  outputFormat: "csv" | "json";
};

export type ReconciliationJobData = {
  walletId?: string; // undefined = reconcile all wallets
  date: string;
};
