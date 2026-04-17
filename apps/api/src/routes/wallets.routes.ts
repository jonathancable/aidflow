// apps/api/src/routes/wallets.routes.ts
import { Router } from "express";
import { LedgerService } from "@services/ledger.service";
import { findWalletById } from "@dal/wallet.dal";
import { findLedgerEntriesByWallet } from "@dal/ledger.dal";
import { authenticate } from "@middleware/authenticate.middleware";
import { authorize } from "@middleware/authorize.middleware";
import { NotFoundError, AuthorizationError } from "@middleware/errors";

const router = Router();

// Verify caller is allowed to view a wallet
async function assertWalletAccess(
  walletId: string,
  userId: string,
  role: string,
  orgId: string | null,
) {
  const wallet = await findWalletById(walletId);
  if (!wallet) throw new NotFoundError("Wallet");

  // Admins and Controllers see all wallets
  if (role === "system_admin" || role === "system_controller") return wallet;

  // Donors see only their own wallet
  if (
    role === "donor" &&
    wallet.ownerType === "donor" &&
    wallet.ownerId === userId
  )
    return wallet;

  // NGOs see wallets belonging to their programs
  if (role === "ngo" && wallet.ownerType === "program") {
    // Program must belong to NGO's org — check via program table
    const { prisma } = await import("@/lib/prisma");
    const program = await prisma.program.findFirst({
      where: { id: wallet.ownerId, orgId: orgId ?? "" },
    });
    if (program) return wallet;
  }

  throw new AuthorizationError("You do not have access to this wallet");
}

// GET /api/v1/wallets — admin / controller only — list all wallets with owner labels
router.get(
  "/",
  authenticate,
  authorize("wallets", "read"),
  async (req, res, next) => {
    try {
      const role = req.context.role;
      if (role !== "system_admin" && role !== "system_controller") {
        throw new AuthorizationError("Admin or Controller access required");
      }
      const { prisma } = await import("@/lib/prisma");
      const wallets = await prisma.wallet.findMany({ orderBy: { createdAt: "asc" } });

      const donorIds = wallets.filter((w) => w.ownerType === "donor").map((w) => w.ownerId);
      const programIds = wallets.filter((w) => w.ownerType === "program").map((w) => w.ownerId);
      const [users, programs] = await Promise.all([
        prisma.user.findMany({ where: { id: { in: donorIds } }, select: { id: true, fullName: true } }),
        prisma.program.findMany({ where: { id: { in: programIds } }, select: { id: true, name: true } }),
      ]);
      const userMap = Object.fromEntries(users.map((u) => [u.id, u.fullName]));
      const programMap = Object.fromEntries(programs.map((p) => [p.id, p.name]));

      const data = wallets.map((w) => ({
        id: w.id,
        ownerType: w.ownerType,
        ownerId: w.ownerId,
        ownerName:
          w.ownerType === "donor" ? (userMap[w.ownerId] ?? w.ownerId) :
          w.ownerType === "program" ? (programMap[w.ownerId] ?? w.ownerId) :
          w.ownerType === "system_treasury" ? "System Treasury" : w.ownerId,
        balance: Number(w.balance),
        reservedAmount: Number(w.reservedAmount),
        available: Number(w.balance) - Number(w.reservedAmount),
        currency: w.currency,
      }));
      return res.json({ success: true, data });
    } catch (err) {
      return next(err);
    }
  },
);

// GET /api/v1/wallets/:id
router.get(
  "/:id",
  authenticate,
  authorize("wallets", "read"),
  async (req, res, next) => {
    try {
      const wallet = await assertWalletAccess(
        req.params.id!,
        req.context.userId,
        req.context.role,
        req.context.orgId,
      );
      const balance = await LedgerService.getBalance(wallet.id);
      return res.json({ success: true, data: { ...wallet, ...balance } });
    } catch (err) {
      return next(err);
    }
  },
);

// GET /api/v1/wallets/:id/transactions
router.get(
  "/:id/transactions",
  authenticate,
  authorize("wallets", "read"),
  async (req, res, next) => {
    try {
      await assertWalletAccess(
        req.params.id!,
        req.context.userId,
        req.context.role,
        req.context.orgId,
      );
      const { page, limit, from, to } = req.query;
      const result = await findLedgerEntriesByWallet(req.params.id!, {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        ...(from ? { from: new Date(from as string) } : {}),
        ...(to ? { to: new Date(to as string) } : {}),
      });
      return res.json({
        success: true,
        data: result.entries,
        meta: { total: result.total, page: result.page, limit: result.limit },
      });
    } catch (err) {
      return next(err);
    }
  },
);

export { router as walletsRouter };
