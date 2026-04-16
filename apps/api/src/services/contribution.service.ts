// apps/api/src/services/contribution.service.ts
import { prisma } from "@/lib/prisma";
import { LedgerService } from "@services/ledger.service";
import { findWalletByOwner, createWallet } from "@dal/wallet.dal";
import { findProgramById, updateProgramFundedAmount } from "@dal/program.dal";
import { NotFoundError, ConflictError } from "@middleware/errors";
import { NotificationService } from "@services/notification.service";
import { withAudit } from "@/lib/with-audit";
import type { AuditContext } from "@services/audit.service";

// Payment gateway stub — replaced with real gateway in Sprint 6
async function processPaymentStub(
  _amount: number,
  _currency: string,
): Promise<string> {
  // Returns a fake payment reference for development
  return `PAY-STUB-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export const ContributionService = {
  async create(params: {
    donorId: string;
    programId: string;
    amount: number;
    currency?: string;
    notes?: string;
  }, _context?: AuditContext) {
    const { donorId, programId, amount, currency = "USD", notes } = params;
    if (amount <= 0) throw new Error("Contribution amount must be positive");

    // Validate program is active and accepting contributions
    const program = await findProgramById(programId);
    if (!program) throw new NotFoundError("Program");
    if (program.status !== "active") {
      throw new ConflictError(
        `Program is not accepting contributions (status: ${program.status})`,
      );
    }

    // Ensure donor wallet exists (created at registration for donors)
    let donorWallet = await findWalletByOwner(donorId);
    if (!donorWallet) {
      donorWallet = await createWallet({
        ownerType: "donor",
        ownerId: donorId,
        currency,
      });
    }

    // Get program wallet
    const programWallet = await findWalletByOwner(programId);
    if (!programWallet) throw new NotFoundError("Program wallet");

    // Step 1: Process payment (stub — replace with real gateway in Sprint 6)
    const paymentRef = await processPaymentStub(amount, currency);

    // Step 2: Transfer funds and record the contribution atomically
    const contribution = await prisma.$transaction(async (tx) => {
      // Transfer from donor wallet to program wallet via LedgerService
      await LedgerService.transfer({
        fromWalletId: donorWallet!.id,
        toWalletId: programWallet.id,
        amount,
        currency,
        referenceType: "contribution",
        referenceId: paymentRef,
        description: `Contribution to ${program.name}`,
        actorId: donorId,
      });

      // Update program funded amount
      await updateProgramFundedAmount(programId, amount, tx);

      // Create contribution record
      return tx.contribution.create({
        data: {
          donorId,
          programId,
          amount,
          currency,
          paymentRef,
          status: "confirmed",
          confirmedAt: new Date(),
          notes: notes ?? null,
        },
      });
    });

    // Step 3: Send notification (async — non-blocking)
    await NotificationService.dispatch(donorId, "contribution_confirmed", {
      amount,
      currency,
      programName: program.name,
      contributionId: contribution.id,
    }).catch(() => {}); // never fail the main flow on notification error

    return contribution;
  },

  async findById(id: string, requestorId: string, requestorRole: string) {
    const contribution = await prisma.contribution.findUnique({
      where: { id },
      include: {
        program: { select: { id: true, name: true } },
        donor: { select: { id: true, fullName: true, email: true } },
      },
    });
    if (!contribution) throw new NotFoundError("Contribution");

    // Donors can only see their own contributions
    if (requestorRole === "donor" && contribution.donorId !== requestorId) {
      throw new NotFoundError("Contribution"); // intentional — don't reveal existence
    }
    return contribution;
  },

  async findByDonor(donorId: string, page = 1, limit = 20) {
    const [items, total] = await prisma.$transaction([
      prisma.contribution.findMany({
        where: { donorId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { program: { select: { id: true, name: true } } },
      }),
      prisma.contribution.count({ where: { donorId } }),
    ]);
    return { items, total, page, limit };
  },
};

// ── Audit wrapping ────────────────────────────────────────────────────────────
const _createRaw = ContributionService.create.bind(ContributionService);
ContributionService.create = withAudit(_createRaw, {
  action:      "CREATE",
  entityType:  "contribution",
  getEntityId: (result) => (result as Awaited<ReturnType<typeof _createRaw>>).id,
  getAfter:    async (result) => {
    const r = result as Awaited<ReturnType<typeof _createRaw>>;
    return {
      amount:    Number(r.amount),
      currency:  r.currency,
      programId: r.programId,
      status:    r.status,
    };
  },
}) as typeof ContributionService.create;
