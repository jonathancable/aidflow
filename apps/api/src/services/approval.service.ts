// apps/api/src/services/approval.service.ts
import { prisma } from "@/lib/prisma";
import { getApprovalRule } from "@config/approval-rules";
import {
  NotFoundError,
  AuthorizationError,
  ConflictError,
} from "@middleware/errors";
import type { UserRole, ApprovalStatus } from "@/generated/prisma";

// Resolver registry — each module registers its own callback
// Called by ApprovalService.resolve() after status update
type ResolverFn = (
  entityId: string,
  decision: "approved" | "rejected",
  actorId: string,
  notes?: string,
) => Promise<void>;
const resolvers = new Map<string, ResolverFn>();

export const ApprovalService = {
  // Register a resolver callback for an entity type
  // Called once at app startup by each module
  registerResolver(entityType: string, fn: ResolverFn): void {
    resolvers.set(entityType, fn);
  },

  // Create a pending approval request for an entity
  async request(params: {
    entityType: string;
    entityId: string;
    action: string;
    requestedById: string;
  }): Promise<string> {
    const { entityType, entityId, action, requestedById } = params;
    const rule = getApprovalRule(entityType);

    // Guard: one open approval per entity at a time
    const existing = await prisma.approvalRequest.findFirst({
      where: { entityId, entityType, status: "pending" },
    });
    if (existing)
      throw new ConflictError(
        "An approval request is already pending for this entity",
      );

    const approvalRequest = await prisma.approvalRequest.create({
      data: {
        entityType,
        entityId,
        action,
        requestedById,
        assignedToRole: rule.assignedToRole,
        status: "pending",
      },
    });

    return approvalRequest.id;
  },

  // Resolve (approve or reject) a pending approval request
  async resolve(params: {
    approvalId: string;
    decision: "approved" | "rejected";
    resolvedById: string;
    resolverRole: UserRole;
    notes?: string;
  }): Promise<void> {
    const { approvalId, decision, resolvedById, resolverRole, notes } = params;

    const approval = await prisma.approvalRequest.findUnique({
      where: { id: approvalId },
    });
    if (!approval) throw new NotFoundError("Approval request");
    if (approval.status !== "pending") {
      throw new ConflictError(`Approval request is already ${approval.status}`);
    }

    // Verify resolver has the correct role
    if (approval.assignedToRole !== resolverRole) {
      throw new AuthorizationError(
        `Only role '${approval.assignedToRole}' can resolve this approval`,
      );
    }

    // Fire the entity-specific resolver FIRST so that if it throws
    // (e.g. insufficient funds, bad wallet), the approval record stays
    // "pending" and the controller can see it again to retry.
    const resolver = resolvers.get(approval.entityType);
    if (resolver) {
      await resolver(approval.entityId, decision, resolvedById, notes);
    }

    // Only mark the approval resolved once the resolver has succeeded.
    await prisma.approvalRequest.update({
      where: { id: approvalId },
      data: {
        status: decision,
        resolvedById,
        resolvedAt: new Date(),
        notes: notes ?? null,
      },
    });
  },

  // Get pending approvals — used by the Controller's queue
  async getQueue(params: {
    role: UserRole;
    status?: string;
    entityType?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      role,
      status = "pending",
      entityType,
      page = 1,
      limit = 20,
    } = params;
    const where = {
      assignedToRole: role,
      status: status as ApprovalStatus,
      ...(entityType ? { entityType } : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.approvalRequest.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          requestedBy: { select: { id: true, fullName: true, role: true } },
        },
      }),
      prisma.approvalRequest.count({ where }),
    ]);
    return { items, total, page, limit };
  },
};
