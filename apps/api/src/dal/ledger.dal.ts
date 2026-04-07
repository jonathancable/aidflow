import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import { Decimal } from "@prisma/client/runtime/library";

// Called ONLY by LedgerService — must run inside a Prisma transaction
export async function createLedgerEntry(
  data: {
    debitWalletId: string;
    creditWalletId: string;
    amount: Decimal;
    currency: string;
    referenceType: string;
    referenceId: string;
    description?: string;
    createdBy: string;
  },
  tx: Prisma.TransactionClient,
) {
  return tx.ledgerEntry.create({ data });
}

export async function findLedgerEntriesByWallet(
  walletId: string,
  params: { page: number; limit: number; from?: Date; to?: Date },
) {
  const { page, limit, from, to } = params;
  const where = {
    OR: [{ debitWalletId: walletId }, { creditWalletId: walletId }],
    ...(from || to ? { createdAt: { gte: from, lte: to } } : {}),
  };
  const [entries, total] = await prisma.$transaction([
    prisma.ledgerEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.ledgerEntry.count({ where }),
  ]);
  return { entries, total, page, limit };
}
