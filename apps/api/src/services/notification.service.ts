// apps/api/src/services/notification.service.ts
import { prisma } from "@/lib/prisma";
import { logger } from "@middleware/logger.middleware";
import type { UserRole } from "@/generated/prisma";
import type { Prisma } from "@/generated/prisma";

// Event-to-recipient mapping — defines who gets notified for each event
const EVENT_RECIPIENTS: Record<
  string,
  {
    recipientType: "actor" | "role" | "specific";
    targetRole?: string;
    titleFn: (payload: Record<string, unknown>) => string;
    bodyFn: (payload: Record<string, unknown>) => string;
  }
> = {
  contribution_confirmed: {
    recipientType: "actor",
    titleFn: (p) => {
      const { currency, amount } = p as { currency: string; amount: number };
      return `Contribution confirmed — ${currency} ${amount.toLocaleString()}`;
    },
    bodyFn: (p) => {
      const { programName } = p as { programName: string };
      return `Your contribution to "${programName}" has been received and confirmed.`;
    },
  },
  allocation_submitted: {
    recipientType: "role",
    targetRole: "system_controller",
    titleFn: (_) => "New allocation awaiting approval",
    bodyFn: (p) => {
      const { currency, amount, programName } = p as { currency: string; amount: number; programName: string };
      return `An allocation of ${currency} ${amount.toLocaleString()} for "${programName}" requires your review.`;
    },
  },
  allocation_approved: {
    recipientType: "specific",
    titleFn: (p) => {
      const { currency, amount } = p as { currency: string; amount: number };
      return `Allocation approved — ${currency} ${amount.toLocaleString()}`;
    },
    bodyFn: (p) => {
      const { programName } = p as { programName: string };
      return `Your allocation request for "${programName}" has been approved and funds have been transferred.`;
    },
  },
  allocation_rejected: {
    recipientType: "specific",
    titleFn: (_) => "Allocation rejected",
    bodyFn: (p) => {
      const { reason } = p as { reason?: string };
      return `Your allocation request has been rejected. Reason: ${reason ?? "See approval notes."}`;
    },
  },
  batch_released: {
    recipientType: "role",
    targetRole: "ngo",
    titleFn: (_) => "Distribution batch released",
    bodyFn: (p) => {
      const { batchId } = p as { batchId: string };
      return `Batch "${batchId}" has been approved and released for distribution.`;
    },
  },
};

export const NotificationService = {
  // Dispatch a notification — never throws, always logs errors
  async dispatch(
    recipientId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      const template = EVENT_RECIPIENTS[eventType];
      if (!template) {
        logger.warn("No notification template for event", { eventType });
        return;
      }

      if (template.recipientType === "role" && template.targetRole) {
        // Broadcast to all active users with the target role
        const users = await prisma.user.findMany({
          where: { role: template.targetRole as UserRole, status: "active" },
          select: { id: true },
        });
        await prisma.notification.createMany({
          data: users.map((u) => ({
            recipientId: u.id,
            type: eventType,
            title: template.titleFn(payload),
            body: template.bodyFn(payload),
            payload: payload as Prisma.InputJsonValue,
          })),
        });
      } else {
        // Send to specific recipient
        await prisma.notification.create({
          data: {
            recipientId,
            type: eventType,
            title: template.titleFn(payload),
            body: template.bodyFn(payload),
            payload: payload as Prisma.InputJsonValue,
          },
        });
      }

      logger.info("Notification dispatched", { eventType, recipientId });
    } catch (err) {
      logger.error("Notification dispatch failed", {
        eventType,
        recipientId,
        err,
      });
      // Intentionally swallowed — notifications must never block the main flow
    }
  },

  // Mark a notification as read
  async markRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id: notificationId, recipientId: userId },
      data: { readAt: new Date() },
    });
  },

  // Get notifications for a user (unread first)
  async getForUser(userId: string, page = 1, limit = 30) {
    const [items, total] = await prisma.$transaction([
      prisma.notification.findMany({
        where: { recipientId: userId },
        orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where: { recipientId: userId } }),
    ]);
    const unreadCount = await prisma.notification.count({
      where: { recipientId: userId, readAt: null },
    });
    return { items, total, unreadCount, page, limit };
  },
};
