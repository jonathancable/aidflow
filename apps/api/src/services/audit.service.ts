// apps/api/src/services/audit.service.ts
import { prisma } from "@/lib/prisma";
import { logger } from "@middleware/logger.middleware";
import { Prisma } from "@/generated/prisma";
import type { UserRole } from "@/generated/prisma";

export interface AuditContext {
  actorId: string;
  actorRole: UserRole;
  ipAddress?: string;
}

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "STATUS_CHANGE"
  | "TRANSFER"
  | "REVERSAL"
  | "APPROVAL_REQUESTED"
  | "APPROVAL_RESOLVED"
  | "LOGIN"
  | "LOGOUT"
  | "PASSWORD_CHANGE"
  | "ACTIVATION"
  | "SUSPENSION";

export const AuditService = {
  async log(params: {
    context: AuditContext;
    action: AuditAction;
    entityType: string;
    entityId: string;
    beforeSnapshot?: Record<string, unknown> | null;
    afterSnapshot?: Record<string, unknown> | null;
  }): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          actorId: params.context.actorId,
          actorRole: params.context.actorRole,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          beforeSnapshot: (params.beforeSnapshot as Prisma.InputJsonValue | null) ?? Prisma.JsonNull,
          afterSnapshot: (params.afterSnapshot as Prisma.InputJsonValue | null) ?? Prisma.JsonNull,
          ...(params.context.ipAddress !== undefined ? { ipAddress: params.context.ipAddress } : {}),
        },
      });
    } catch (err) {
      // Audit log failure must never crash the main operation
      // but MUST be surfaced — a silent audit failure is a compliance incident
      logger.error("AUDIT LOG WRITE FAILED", {
        error: (err as Error).message,
        actorId: params.context.actorId,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
      });
    }
  },

  // Query audit logs for the reporting module
  async query(filters: {
    entityType?: string;
    entityId?: string;
    actorId?: string;
    action?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      entityType,
      entityId,
      actorId,
      action,
      from,
      to,
      page = 1,
      limit = 50,
    } = filters;
    const where = {
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
      ...(actorId ? { actorId } : {}),
      ...(action ? { action } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };
    const [entries, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);
    return { entries, total, page, limit };
  },

  // Paginated export for compliance reports
  async export(filters: { from: Date; to: Date; entityType?: string }) {
    return prisma.auditLog.findMany({
      where: {
        createdAt: { gte: filters.from, lte: filters.to },
        ...(filters.entityType ? { entityType: filters.entityType } : {}),
      },
      orderBy: { createdAt: "asc" },
    });
  },
};
