// apps/api/src/services/ledger.service.ts
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { createLedgerEntry } from "@/dal/ledger.dal";
import { getWalletWithBalance } from "@/dal/wallet.dal";
import {
  InsufficientFundsError,
  NotFoundError,
  LedgerIntegrityError,
} from "@/middleware/errors";

// ── Types ─────────────────────────────────────────────────────────
interface TransferParams {
  fromWalletId: string;
  toWalletId: string;
  amount: number | string;
  currency?: string;
  referenceType: string; // 'contribution' | 'allocation' | 'batch_release' | etc.
  referenceId: string;
  description?: string;
  actorId: string;
}

interface ReserveParams {
  walletId: string;
  amount: number | string;
  referenceId: string;
  actorId: string;
}

interface ReleaseParams {
  walletId: string;
  toWalletId: string; // destination — funds leave the source when reservation is fulfilled
  amount: number | string;
  referenceId: string;
  actorId: string;
}

interface ReverseParams {
  originalDebitWalletId: string;
  originalCreditWalletId: string;
  amount: number | string;
  currency?: string;
  referenceType: string;
  referenceId: string;
  reason: string;
  actorId: string;
}

export const LedgerService = {
  // Move funds from one wallet to another — creates debit + credit entries
  async transfer(params: TransferParams): Promise<void> {
    const {
      fromWalletId,
      toWalletId,
      amount: rawAmount,
      currency = "USD",
      referenceType,
      referenceId,
      description,
      actorId,
    } = params;

    const amount = new Decimal(rawAmount);
    if (amount.lte(0))
      throw new LedgerIntegrityError("Transfer amount must be positive");
    if (fromWalletId === toWalletId)
      throw new LedgerIntegrityError("Cannot transfer to same wallet");

    await prisma.$transaction(async (tx) => {
      const [fromWallet, toWallet] = await Promise.all([
        tx.wallet.findUnique({ where: { id: fromWalletId } }),
        tx.wallet.findUnique({ where: { id: toWalletId } }),
      ]);

      if (!fromWallet) throw new NotFoundError("Source wallet");
      if (!toWallet) throw new NotFoundError("Destination wallet");

      const available = new Decimal(fromWallet.balance).minus(
        fromWallet.reservedAmount,
      );
      if (available.lt(amount)) throw new InsufficientFundsError();

      await tx.wallet.update({
        where: { id: fromWalletId },
        data: { balance: { decrement: amount.toNumber() } },
      });
      await tx.wallet.update({
        where: { id: toWalletId },
        data: { balance: { increment: amount.toNumber() } },
      });

      await createLedgerEntry(
        {
          debitWalletId: fromWalletId,
          creditWalletId: toWalletId,
          amount,
          currency,
          referenceType,
          referenceId,
          ...(description ? { description } : {}),
          createdBy: actorId,
        },
        tx,
      );
    });
  },

  // Reserve funds — available balance decreases, total balance stays the same.
  // Used when an allocation is approved but not yet released to a vendor/beneficiary.
  // Ledger entry records the reservation with debit = credit = same wallet so the
  // audit trail is complete; referenceType "reservation" distinguishes it from transfers.
  async reserve(params: ReserveParams): Promise<void> {
    const { walletId, amount: rawAmount, referenceId, actorId } = params;
    const amount = new Decimal(rawAmount);
    if (amount.lte(0))
      throw new LedgerIntegrityError("Reserve amount must be positive");

    await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
      if (!wallet) throw new NotFoundError("Wallet");

      const available = new Decimal(wallet.balance).minus(
        wallet.reservedAmount,
      );
      if (available.lt(amount)) throw new InsufficientFundsError();

      await tx.wallet.update({
        where: { id: walletId },
        data: { reservedAmount: { increment: amount.toNumber() } },
      });

      await createLedgerEntry(
        {
          debitWalletId: walletId,
          creditWalletId: walletId, // self-referencing — reservation, not a transfer
          amount,
          currency: "USD",
          referenceType: "reservation",
          referenceId,
          createdBy: actorId,
        },
        tx,
      );
    });
  },

  // Release reserved funds to their destination.
  // Decrements both balance and reservedAmount on the source (net effect: the
  // reservation is cleared and funds leave the wallet), then credits the destination.
  async release(params: ReleaseParams): Promise<void> {
    const { walletId, toWalletId, amount: rawAmount, referenceId, actorId } =
      params;
    const amount = new Decimal(rawAmount);
    if (amount.lte(0))
      throw new LedgerIntegrityError("Release amount must be positive");
    if (walletId === toWalletId)
      throw new LedgerIntegrityError("Source and destination wallets must differ");

    await prisma.$transaction(async (tx) => {
      const [fromWallet, toWallet] = await Promise.all([
        tx.wallet.findUnique({ where: { id: walletId } }),
        tx.wallet.findUnique({ where: { id: toWalletId } }),
      ]);

      if (!fromWallet) throw new NotFoundError("Source wallet");
      if (!toWallet) throw new NotFoundError("Destination wallet");

      if (new Decimal(fromWallet.reservedAmount).lt(amount)) {
        throw new LedgerIntegrityError(
          "Reserved amount is less than release amount",
        );
      }

      // Clear reservation on source and debit its balance
      await tx.wallet.update({
        where: { id: walletId },
        data: {
          balance: { decrement: amount.toNumber() },
          reservedAmount: { decrement: amount.toNumber() },
        },
      });

      // Credit destination
      await tx.wallet.update({
        where: { id: toWalletId },
        data: { balance: { increment: amount.toNumber() } },
      });

      await createLedgerEntry(
        {
          debitWalletId: walletId,
          creditWalletId: toWalletId,
          amount,
          currency: "USD",
          referenceType: "release",
          referenceId,
          createdBy: actorId,
        },
        tx,
      );
    });
  },

  // Reverse a previous transfer — creates inverse ledger entries.
  // Does NOT delete original entries — the ledger is append-only.
  async reverse(params: ReverseParams): Promise<void> {
    const {
      originalDebitWalletId,
      originalCreditWalletId,
      amount: rawAmount,
      currency = "USD",
      referenceType,
      referenceId,
      reason,
      actorId,
    } = params;

    const amount = new Decimal(rawAmount);
    if (amount.lte(0))
      throw new LedgerIntegrityError("Reversal amount must be positive");
    if (originalDebitWalletId === originalCreditWalletId)
      throw new LedgerIntegrityError("Debit and credit wallets must differ");

    await prisma.$transaction(async (tx) => {
      const [debitWallet, creditWallet] = await Promise.all([
        tx.wallet.findUnique({ where: { id: originalDebitWalletId } }),
        tx.wallet.findUnique({ where: { id: originalCreditWalletId } }),
      ]);

      if (!debitWallet) throw new NotFoundError("Original debit wallet");
      if (!creditWallet) throw new NotFoundError("Original credit wallet");

      // The credit wallet holds the funds being reversed — check its available balance
      const available = new Decimal(creditWallet.balance).minus(
        creditWallet.reservedAmount,
      );
      if (available.lt(amount)) throw new InsufficientFundsError();

      // Reverse: return funds from the original credit wallet back to the original debit wallet
      await tx.wallet.update({
        where: { id: originalDebitWalletId },
        data: { balance: { increment: amount.toNumber() } },
      });
      await tx.wallet.update({
        where: { id: originalCreditWalletId },
        data: { balance: { decrement: amount.toNumber() } },
      });

      // Reversal entry — direction is inverted relative to the original transfer
      await createLedgerEntry(
        {
          debitWalletId: originalCreditWalletId,
          creditWalletId: originalDebitWalletId,
          amount,
          currency,
          referenceType: `${referenceType}_reversal`,
          referenceId,
          description: `Reversal: ${reason}`,
          createdBy: actorId,
        },
        tx,
      );
    });
  },

  // Read-only: get wallet balance summary
  async getBalance(walletId: string) {
    const wallet = await getWalletWithBalance(walletId);
    if (!wallet) throw new NotFoundError("Wallet");
    return {
      total: wallet.balance,
      reserved: wallet.reservedAmount,
      available: wallet.available,
      currency: wallet.currency,
    };
  },
};
