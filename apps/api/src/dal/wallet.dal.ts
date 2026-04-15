import { prisma } from "@/lib/prisma";
import type { Prisma, WalletOwnerType } from "@/generated/prisma";
import { Decimal } from "@prisma/client/runtime/library";

export async function findWalletById(id: string) {
  return prisma.wallet.findUnique({ where: { id } });
}

export async function findWalletByOwner(ownerId: string) {
  return prisma.wallet.findUnique({ where: { ownerId } });
}

export async function createWallet(data: {
  ownerType: WalletOwnerType;
  ownerId: string;
  currency?: string;
}) {
  return prisma.wallet.create({
    data: { ...data, balance: 0, reservedAmount: 0 },
  });
}

export async function getWalletWithBalance(walletId: string) {
  const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
  if (!wallet) return null;
  return {
    ...wallet,
    available: new Decimal(wallet.balance).minus(wallet.reservedAmount),
  };
}

// Only called by LedgerService — within a Prisma transaction
export async function updateWalletBalance(
  walletId: string,
  balanceDelta: Decimal,
  reservedDelta: Decimal,
  tx: Prisma.TransactionClient,
) {
  return tx.wallet.update({
    where: { id: walletId },
    data: {
      balance: { increment: balanceDelta },
      reservedAmount: { increment: reservedDelta },
    },
  });
}
