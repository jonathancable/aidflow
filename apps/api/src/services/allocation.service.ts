// apps/api/src/services/allocation.service.ts
import { prisma } from "@/lib/prisma";
import { LedgerService } from "@services/ledger.service";
import { ApprovalService } from "@services/approval.service";
import { findWalletById } from "@dal/wallet.dal";
import {
  NotFoundError,
  StateTransitionError,
  InsufficientFundsError,
} from "@middleware/errors";
import type { AllocationStatus } from "@/generated/prisma";

import { withAudit } from "@/lib/with-audit";
import type { AuditContext } from "@services/audit.service";

export const AllocationService = {
  // Register the approval resolver — call once at app startup
  registerApprovalResolver(): void {
    ApprovalService.registerResolver(
      "allocation",
      async (entityId, decision, actorId) => {
        const allocation = await prisma.allocation.findUnique({
          where: { id: entityId },
        });
        if (!allocation) return;

        if (decision === "approved") {
          // Move funds: reserve on source wallet, then transfer to destination
          await LedgerService.transfer({
            fromWalletId: allocation.sourceWalletId,
            toWalletId: allocation.destWalletId,
            amount: Number(allocation.amount),
            currency: allocation.currency,
            referenceType: "allocation",
            referenceId: allocation.id,
            description: `Allocation approved by controller`,
            actorId,
          });

          await prisma.allocation.update({
            where: { id: entityId },
            data: {
              status: "approved",
              approvedBy: actorId,
              approvedAt: new Date(),
            },
          });
        } else {
          // Rejected — reset to draft so it can be amended and resubmitted
          await prisma.allocation.update({
            where: { id: entityId },
            data: { status: "rejected" },
          });
        }
      },
    );
  },

  async create(params: {
    programId: string;
    sourceWalletId: string;
    destWalletId: string;
    amount: number;
    currency?: string;
    notes?: string;
    requestedBy: string;
  }, _context?: AuditContext) {
    const {
      programId,
      sourceWalletId,
      destWalletId,
      amount,
      currency = "USD",
      notes,
      requestedBy,
    } = params;

    // Validate wallets exist and source has sufficient balance
    const [sourceWallet, destWallet] = await Promise.all([
      findWalletById(sourceWalletId),
      findWalletById(destWalletId),
    ]);
    if (!sourceWallet) throw new NotFoundError("Source wallet");
    if (!destWallet) throw new NotFoundError("Destination wallet");

    const available =
      Number(sourceWallet.balance) - Number(sourceWallet.reservedAmount);
    if (available < amount) throw new InsufficientFundsError();

    // Create allocation record + submit approval request atomically
    const allocation = await prisma.$transaction(async (tx) => {
      const alloc = await tx.allocation.create({
        data: {
          programId,
          sourceWalletId,
          destWalletId,
          amount,
          currency,
          notes: notes ?? null,
          requestedBy,
          status: "pending_approval",
        },
      });
      return alloc;
    });

    // Submit for Controller approval
    const approvalId = await ApprovalService.request({
      entityType: "allocation",
      entityId: allocation.id,
      action: "approve_allocation",
      requestedById: requestedBy,
    });

    return { allocation, approvalId };
  },

  async findById(id: string) {
    const allocation = await prisma.allocation.findUnique({
      where: { id },
      include: {
        program: { select: { id: true, name: true } },
        sourceWallet: { select: { id: true, ownerType: true, balance: true } },
        destWallet: { select: { id: true, ownerType: true, balance: true } },
      },
    });
    if (!allocation) throw new NotFoundError("Allocation");
    return allocation;
  },

  async findAll(filters: {
    programId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { programId, status, page = 1, limit = 20 } = filters;
    const where = {
      ...(programId ? { programId } : {}),
      ...(status ? { status: status as AllocationStatus } : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.allocation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { program: { select: { id: true, name: true } } },
      }),
      prisma.allocation.count({ where }),
    ]);
    return { items, total, page, limit };
  },

  async reverse(allocationId: string, reason: string, actorId: string, _context?: AuditContext) {
    const allocation = await prisma.allocation.findUnique({
      where: { id: allocationId },
    });
    if (!allocation) throw new NotFoundError("Allocation");
    if (allocation.status !== "approved") {
      throw new StateTransitionError(allocation.status, "reversed");
    }

    // Create reverse ledger entries (LedgerService is append-only)
    await LedgerService.reverse({
      originalDebitWalletId: allocation.sourceWalletId,
      originalCreditWalletId: allocation.destWalletId,
      amount: Number(allocation.amount),
      currency: allocation.currency,
      referenceType: "allocation",
      referenceId: allocation.id,
      reason,
      actorId,
    });

    return prisma.allocation.update({
      where: { id: allocationId },
      data: { status: "reversed" },
    });
  },
};

// ── Audit wrapping ────────────────────────────────────────────────────────────
// Re-assign the wrapped versions so callers automatically get audit logs.
// Routes pass { actorId, actorRole, ipAddress } as the final argument.

const _createRaw = AllocationService.create.bind(AllocationService);
AllocationService.create = withAudit(_createRaw, {
  action:      "CREATE",
  entityType:  "allocation",
  getEntityId: (result) => {
    const r = result as Awaited<ReturnType<typeof _createRaw>>;
    return r.allocation.id;
  },
  getAfter: async (result) => {
    const r = result as Awaited<ReturnType<typeof _createRaw>>;
    return {
      status:    r.allocation.status,
      amount:    Number(r.allocation.amount),
      programId: r.allocation.programId,
    };
  },
}) as typeof AllocationService.create;

const _reverseRaw = AllocationService.reverse.bind(AllocationService);
AllocationService.reverse = withAudit(_reverseRaw, {
  action:      "REVERSAL",
  entityType:  "allocation",
  getEntityId: (result) => (result as Awaited<ReturnType<typeof _reverseRaw>>).id,
  getBefore:   async ([allocationId]) => {
    const a = await prisma.allocation.findUnique({ where: { id: allocationId as string } });
    return a ? { status: a.status, amount: Number(a.amount) } : null;
  },
  getAfter: async (result) => {
    const r = result as Awaited<ReturnType<typeof _reverseRaw>>;
    return { status: r.status };
  },
}) as typeof AllocationService.reverse;
