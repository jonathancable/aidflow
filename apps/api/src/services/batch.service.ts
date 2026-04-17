// apps/api/src/services/batch.service.ts
import { prisma } from "@/lib/prisma";
import { LedgerService } from "@services/ledger.service";
import { ApprovalService } from "@services/approval.service";
import { NotificationService } from "@services/notification.service";
import { findWalletByOwner } from "@dal/wallet.dal";
import {
  NotFoundError,
  ConflictError,
  StateTransitionError,
  InsufficientFundsError,
} from "@middleware/errors";

export const BatchService = {
  // Register approval resolver — call at startup
  registerApprovalResolver(): void {
    ApprovalService.registerResolver(
      "batch_release",
      async (entityId, decision, actorId) => {
        const batch = await prisma.distributionBatch.findUnique({
          where: { id: entityId },
          include: { items: true },
        });
        if (!batch) return;

        if (decision === "approved") {
          const programWallet = await findWalletByOwner(batch.programId);
          if (!programWallet) throw new NotFoundError("Program wallet");

          const systemWallet = await prisma.wallet.findFirst({
            where: { ownerType: "system_treasury" },
          });
          if (!systemWallet) throw new NotFoundError("System treasury wallet");

          await prisma.$transaction(async (tx) => {
            for (const item of batch.items) {
              await tx.beneficiaryEntitlement.create({
                data: {
                  beneficiaryId: item.beneficiaryId,
                  batchItemId: item.id,
                  amount: item.entitlementAmount,
                },
              });
              await tx.batchItem.update({
                where: { id: item.id },
                data: { status: "pending" },
              });
            }

            // Release the reservation: debits program wallet balance+reserved, credits system treasury
            await LedgerService.release({
              walletId: programWallet.id,
              toWalletId: systemWallet.id,
              amount: Number(batch.totalAmount),
              referenceId: batch.id,
              actorId,
            });

            await tx.distributionBatch.update({
              where: { id: entityId },
              data: {
                status: "released",
                approvedBy: actorId,
                approvedAt: new Date(),
                releasedAt: new Date(),
              },
            });
          });

          await NotificationService.dispatch(batch.ngoOrgId, "batch_released", {
            batchId: batch.id,
            programId: batch.programId,
          });
        } else {
          // Rejected — cancel the reservation (decrement reservedAmount, no fund movement)
          const programWallet = await findWalletByOwner(batch.programId);
          if (programWallet) {
            await prisma.wallet.update({
              where: { id: programWallet.id },
              data: { reservedAmount: { decrement: Number(batch.totalAmount) } },
            });
          }
          await prisma.distributionBatch.update({
            where: { id: entityId },
            data: { status: "cancelled" },
          });
        }
      },
    );
  },

  async create(params: {
    programId: string;
    ngoOrgId: string;
    totalAmount: number;
    notes?: string | undefined;
    submittedBy: string;
  }) {
    const { programId, ngoOrgId, totalAmount, notes, submittedBy } = params;

    const programWallet = await findWalletByOwner(programId);
    if (!programWallet) throw new NotFoundError("Program wallet");

    const available =
      Number(programWallet.balance) - Number(programWallet.reservedAmount);
    if (available < totalAmount) throw new InsufficientFundsError();

    // Create batch + reserve funds atomically
    const batch = await prisma.$transaction(async (tx) => {
      const b = await tx.distributionBatch.create({
        data: {
          programId,
          ngoOrgId,
          totalAmount,
          notes: notes ?? null,
          status: "draft",
          beneficiaryCount: 0,
          submittedBy,
        },
      });
      // Reserve funds on program wallet immediately
      await LedgerService.reserve({
        walletId: programWallet.id,
        amount: totalAmount,
        referenceId: b.id,
        actorId: submittedBy,
      });
      return b;
    });
    return batch;
  },

  async addItems(
    batchId: string,
    items: { beneficiaryId: string; entitlementAmount: number }[],
  ) {
    const batch = await prisma.distributionBatch.findUnique({
      where: { id: batchId },
    });
    if (!batch) throw new NotFoundError("Batch");
    if (batch.status !== "draft")
      throw new StateTransitionError(batch.status, "draft");

    const totalItems = items.reduce((sum, i) => sum + i.entitlementAmount, 0);
    if (totalItems > Number(batch.totalAmount)) {
      throw new ConflictError("Sum of item amounts exceeds batch total amount");
    }

    await prisma.$transaction(async (tx) => {
      await tx.batchItem.createMany({
        data: items.map((i) => ({ batchId, ...i, status: "pending" })),
        skipDuplicates: true,
      });
      await tx.distributionBatch.update({
        where: { id: batchId },
        data: { beneficiaryCount: { increment: items.length } },
      });
    });

    return prisma.distributionBatch.findUnique({
      where: { id: batchId },
      include: { items: { include: { beneficiary: true } } },
    });
  },

  async submit(batchId: string, submittedBy: string) {
    const batch = await prisma.distributionBatch.findUnique({
      where: { id: batchId },
    });
    if (!batch) throw new NotFoundError("Batch");
    if (batch.status !== "draft")
      throw new StateTransitionError(batch.status, "submitted");
    if (batch.beneficiaryCount === 0)
      throw new ConflictError("Batch has no beneficiary items");

    await prisma.distributionBatch.update({
      where: { id: batchId },
      data: { status: "submitted", submittedBy },
    });

    const approvalId = await ApprovalService.request({
      entityType: "batch_release",
      entityId: batchId,
      action: "approve_batch_release",
      requestedById: submittedBy,
    });

    return { batchId, approvalId };
  },

  async findById(id: string) {
    const batch = await prisma.distributionBatch.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            beneficiary: {
              select: { id: true, encryptedName: true, profileData: true },
            },
          },
        },
        program: { select: { id: true, name: true } },
      },
    });
    if (!batch) throw new NotFoundError("Batch");
    return batch;
  },
};
