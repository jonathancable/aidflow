// apps/api/src/tests/integration/ledger.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { LedgerService } from "@/services/ledger.service";
import { InsufficientFundsError } from "@/middleware/errors";

describe("LedgerService integration tests", () => {
  let actorId: string;
  let walletA: string;
  let walletB: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `ledger-${Date.now()}@test.com`,
        passwordHash: "x",
        fullName: "Ledger Test",
        role: "system_admin",
      },
    });
    actorId = user.id;
  });

  beforeEach(async () => {
    // Fresh wallets for each test — prevents test interdependence
    const [a, b] = await Promise.all([
      prisma.wallet.create({
        data: {
          ownerType: "donor",
          ownerId: crypto.randomUUID(),
          balance: 1000,
          currency: "USD",
        },
      }),
      prisma.wallet.create({
        data: {
          ownerType: "program",
          ownerId: crypto.randomUUID(),
          balance: 0,
          currency: "USD",
        },
      }),
    ]);
    walletA = a.id;
    walletB = b.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: "ledger-" } } });
  });

  // ── Transfer tests ─────────────────────────────────────────────
  it("transfers funds correctly — balances and ledger entry", async () => {
    await LedgerService.transfer({
      fromWalletId: walletA,
      toWalletId: walletB,
      amount: 400,
      referenceType: "contribution",
      referenceId: "ref-1",
      actorId,
    });

    const [a, b] = await Promise.all([
      prisma.wallet.findUnique({ where: { id: walletA } }),
      prisma.wallet.findUnique({ where: { id: walletB } }),
    ]);
    expect(Number(a!.balance)).toBe(600);
    expect(Number(b!.balance)).toBe(400);

    const entry = await prisma.ledgerEntry.findFirst({
      where: { referenceId: "ref-1", debitWalletId: walletA },
    });
    expect(entry).not.toBeNull();
    expect(Number(entry!.amount)).toBe(400);
    expect(entry!.debitWalletId).toBe(walletA);
    expect(entry!.creditWalletId).toBe(walletB);
  });

  it("throws InsufficientFundsError when balance too low", async () => {
    await expect(
      LedgerService.transfer({
        fromWalletId: walletA,
        toWalletId: walletB,
        amount: 9999,
        referenceType: "contribution",
        referenceId: "ref-2",
        actorId,
      }),
    ).rejects.toThrow(InsufficientFundsError);

    // Balances must be unchanged after a failed transfer
    const a = await prisma.wallet.findUnique({ where: { id: walletA } });
    expect(Number(a!.balance)).toBe(1000);
  });

  it("rolls back both balance updates if destination wallet does not exist", async () => {
    await expect(
      LedgerService.transfer({
        fromWalletId: walletA,
        toWalletId: "00000000-0000-0000-0000-000000000000", // non-existent wallet
        amount: 100,
        referenceType: "contribution",
        referenceId: "ref-rollback",
        actorId,
      }),
    ).rejects.toThrow();

    // Source wallet balance must be unchanged — transaction rolled back
    const a = await prisma.wallet.findUnique({ where: { id: walletA } });
    expect(Number(a!.balance)).toBe(1000);
  });

  it("rejects zero-amount transfer", async () => {
    await expect(
      LedgerService.transfer({
        fromWalletId: walletA,
        toWalletId: walletB,
        amount: 0,
        referenceType: "contribution",
        referenceId: "ref-3",
        actorId,
      }),
    ).rejects.toThrow("must be positive");
  });

  it("rejects same-wallet transfer", async () => {
    await expect(
      LedgerService.transfer({
        fromWalletId: walletA,
        toWalletId: walletA,
        amount: 100,
        referenceType: "contribution",
        referenceId: "ref-4",
        actorId,
      }),
    ).rejects.toThrow("same wallet");
  });

  // ── Reserve tests ──────────────────────────────────────────────
  it("reduces available balance on reserve without changing total", async () => {
    await LedgerService.reserve({
      walletId: walletA,
      amount: 300,
      referenceId: "rsv-1",
      actorId,
    });
    const a = await prisma.wallet.findUnique({ where: { id: walletA } });
    expect(Number(a!.balance)).toBe(1000); // total unchanged
    expect(Number(a!.reservedAmount)).toBe(300); // reserved increased
  });

  it("throws InsufficientFundsError on reserve exceeding available", async () => {
    await expect(
      LedgerService.reserve({
        walletId: walletA,
        amount: 1500,
        referenceId: "rsv-2",
        actorId,
      }),
    ).rejects.toThrow(InsufficientFundsError);
  });

  // ── Reverse tests ──────────────────────────────────────────────
  it("reversal restores balances and creates inverse ledger entry", async () => {
    await LedgerService.transfer({
      fromWalletId: walletA,
      toWalletId: walletB,
      amount: 200,
      referenceType: "contribution",
      referenceId: "fwd-1",
      actorId,
    });

    await LedgerService.reverse({
      originalDebitWalletId: walletA,
      originalCreditWalletId: walletB,
      amount: 200,
      referenceType: "contribution",
      referenceId: "fwd-1",
      reason: "Test reversal",
      actorId,
    });

    const [a, b] = await Promise.all([
      prisma.wallet.findUnique({ where: { id: walletA } }),
      prisma.wallet.findUnique({ where: { id: walletB } }),
    ]);
    expect(Number(a!.balance)).toBe(1000); // restored
    expect(Number(b!.balance)).toBe(0); // restored

    // Two ledger entries should exist — original + reversal
    const entries = await prisma.ledgerEntry.findMany({
      where: {
        referenceId: "fwd-1",
        OR: [{ debitWalletId: walletA }, { debitWalletId: walletB }],
      },
    });
    expect(entries.length).toBe(2);
    const reversal = entries.find(
      (e) => e.referenceType === "contribution_reversal",
    );
    expect(reversal).not.toBeNull();
  });
});
