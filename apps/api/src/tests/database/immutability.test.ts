import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("Append-only table enforcement", () => {
  let testUserId: string;
  let debitWalletId: string;
  let creditWalletId: string;

  beforeAll(async () => {
    const user = await prisma.user.upsert({
      where: { email: "trigger-test@aidflow.test" },
      update: {},
      create: {
        email: "trigger-test@aidflow.test",
        passwordHash: "hash",
        fullName: "Trigger Test",
        role: "system_admin",
      },
    });
    testUserId = user.id;
    // Wallet has three FK constraints on ownerId (user/org/program) — bypass for test
    const dwId = crypto.randomUUID();
    const cwId = crypto.randomUUID();
    await prisma.$executeRaw`SET session_replication_role = replica`;
    await prisma.$executeRaw`
      INSERT INTO wallets (id, "ownerType", "ownerId", balance, "reservedAmount", currency, "createdAt", "updatedAt")
      VALUES
        (${dwId}, 'donor'::"WalletOwnerType",   ${crypto.randomUUID()}, 0, 0, 'USD', NOW(), NOW()),
        (${cwId}, 'program'::"WalletOwnerType", ${crypto.randomUUID()}, 0, 0, 'USD', NOW(), NOW())
    `;
    await prisma.$executeRaw`SET session_replication_role = DEFAULT`;
    debitWalletId = dwId;
    creditWalletId = cwId;
  });

  it("prevents UPDATE on ledger_entries", async () => {
    const entry = await prisma.ledgerEntry.create({
      data: {
        debitWalletId,
        creditWalletId,
        amount: 100,
        currency: "USD",
        referenceType: "test",
        referenceId: "ref-1",
        createdBy: testUserId,
      },
    });
    await expect(
      prisma.$executeRaw`UPDATE ledger_entries SET amount = 999 WHERE id = ${entry.id}`,
    ).rejects.toThrow("append-only");
  });

  it("prevents DELETE on ledger_entries", async () => {
    const entry = await prisma.ledgerEntry.create({
      data: {
        debitWalletId,
        creditWalletId,
        amount: 50,
        currency: "USD",
        referenceType: "test",
        referenceId: "ref-2",
        createdBy: testUserId,
      },
    });
    await expect(
      prisma.$executeRaw`DELETE FROM ledger_entries WHERE id = ${entry.id}`,
    ).rejects.toThrow("append-only");
  });

  it("prevents UPDATE on audit_logs", async () => {
    const log = await prisma.auditLog.create({
      data: {
        actorId: testUserId,
        actorRole: "system_admin",
        action: "TEST",
        entityType: "test",
        entityId: "test-id",
      },
    });
    await expect(
      prisma.$executeRaw`UPDATE audit_logs SET action = 'TAMPERED' WHERE id = ${log.id}`,
    ).rejects.toThrow("append-only");
  });

  afterAll(() => prisma.$disconnect());
});
