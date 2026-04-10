// apps/api/src/jobs/workers.ts
import { Worker, type Job } from "bullmq";
import { redisConnection } from "./queue";
import { NotificationService } from "@services/notification.service";
import { logger } from "@middleware/logger.middleware";
import type { NotificationJobData, ReconciliationJobData } from "./queue";

// Notification worker
export const notificationWorker = new Worker<NotificationJobData>(
  "notifications",
  async (job: Job<NotificationJobData>) => {
    const { recipientId, eventType, payload } = job.data;
    await NotificationService.dispatch(recipientId, eventType, payload);
  },
  { connection: redisConnection, concurrency: 10 },
);

// Reconciliation worker — checks wallet balances against ledger sums
export const reconciliationWorker = new Worker<ReconciliationJobData>(
  "reconciliation",
  async (job: Job<ReconciliationJobData>) => {
    const { prisma } = await import("@/lib/prisma");
    const wallets = job.data.walletId
      ? [await prisma.wallet.findUnique({ where: { id: job.data.walletId } })]
      : await prisma.wallet.findMany();

    for (const wallet of wallets) {
      if (!wallet) continue;

      // Sum all credit entries minus all debit entries
      const [credits, debits] = await Promise.all([
        prisma.ledgerEntry.aggregate({
          where: { creditWalletId: wallet.id },
          _sum: { amount: true },
        }),
        prisma.ledgerEntry.aggregate({
          where: { debitWalletId: wallet.id },
          _sum: { amount: true },
        }),
      ]);

      const expectedBalance =
        Number(credits._sum.amount ?? 0) - Number(debits._sum.amount ?? 0);
      const actualBalance = Number(wallet.balance);
      const discrepancy = Math.abs(expectedBalance - actualBalance);

      if (discrepancy > 0.01) {
        logger.error("LEDGER RECONCILIATION MISMATCH", {
          walletId: wallet.id,
          ownerType: wallet.ownerType,
          expectedBalance,
          actualBalance,
          discrepancy,
          date: job.data.date,
        });
        // In Sprint 6: trigger a critical alert here
      }
    }
  },
  { connection: redisConnection, concurrency: 1 },
);

// Global error handlers for workers
[notificationWorker, reconciliationWorker].forEach((worker) => {
  worker.on("failed", (job, err) => {
    logger.error("Job failed", {
      queue: worker.name,
      jobId: job?.id,
      error: err.message,
    });
  });
});
