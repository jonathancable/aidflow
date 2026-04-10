// apps/api/src/services/vendor.service.ts
import { prisma } from "@/lib/prisma";
import { LedgerService } from "@services/ledger.service";
import { ApprovalService } from "@services/approval.service";
import { findWalletByOwner, createWallet } from "@dal/wallet.dal";
import {
  NotFoundError,
  StateTransitionError,
} from "@middleware/errors";
import type { Prisma } from "@/generated/prisma";

export const VendorService = {
  registerApprovalResolver(): void {
    ApprovalService.registerResolver(
      "vendor_settlement",
      async (entityId, decision, actorId) => {
        const settlement = await prisma.settlement.findUnique({
          where: { id: entityId },
          include: { vendorOrder: true },
        });
        if (!settlement) return;

        if (decision === "approved") {
          // Get program wallet (source) and vendor wallet (destination)
          const programWallet = await findWalletByOwner(
            settlement.vendorOrder.programId,
          );
          if (!programWallet) throw new NotFoundError("Program wallet");

          // Ensure vendor org has a settlement wallet
          let vendorWallet = await findWalletByOwner(
            settlement.vendorOrder.vendorOrgId,
          );
          if (!vendorWallet) {
            vendorWallet = await createWallet({
              ownerType: "vendor",
              ownerId: settlement.vendorOrder.vendorOrgId,
            });
          }

          await LedgerService.transfer({
            fromWalletId: programWallet.id,
            toWalletId: vendorWallet.id,
            amount: Number(settlement.amount),
            referenceType: "vendor_settlement",
            referenceId: settlement.id,
            description: `Vendor settlement for order ${settlement.vendorOrderId}`,
            actorId,
          });

          await prisma.settlement.update({
            where: { id: entityId },
            data: {
              status: "settled",
              approvedBy: actorId,
              settledAt: new Date(),
            },
          });
          await prisma.vendorOrder.update({
            where: { id: settlement.vendorOrderId },
            data: { status: "delivered" },
          });
        } else {
          await prisma.settlement.update({
            where: { id: entityId },
            data: { status: "failed" },
          });
        }
      },
    );
  },

  async createOrder(params: {
    vendorOrgId: string;
    batchId: string;
    programId: string;
    items: { description: string; quantity: number; unitPrice: number }[];
    totalValue: number;
    issuedBy: string;
  }) {
    return prisma.vendorOrder.create({
      data: {
        vendorOrgId: params.vendorOrgId,
        batchId: params.batchId,
        programId: params.programId,
        items: params.items as Prisma.InputJsonValue,
        totalValue: params.totalValue,
        status: "issued",
      },
    });
  },

  async confirmDelivery(orderId: string, deliveryProofUrl: string) {
    const order = await prisma.vendorOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundError("Vendor order");
    if (order.status !== "acknowledged" && order.status !== "in_delivery") {
      throw new StateTransitionError(order.status, "delivered");
    }

    // Create settlement record + submit for approval
    const settlement = await prisma.$transaction(async (tx) => {
      const s = await tx.settlement.create({
        data: {
          vendorOrderId: orderId,
          amount: order.totalValue,
          status: "pending",
        },
      });
      await tx.vendorOrder.update({
        where: { id: orderId },
        data: {
          status: "in_delivery",
          deliveryProofUrl,
          deliveryConfirmedAt: new Date(),
        },
      });
      return s;
    });

    const approvalId = await ApprovalService.request({
      entityType: "vendor_settlement",
      entityId: settlement.id,
      action: "approve_vendor_settlement",
      requestedById: order.vendorOrgId,
    });

    return { settlement, approvalId };
  },
};
