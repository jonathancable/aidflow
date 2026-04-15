// apps/api/src/tests/integration/approval.service.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { ApprovalService } from "@services/approval.service";
import type { UserRole } from "@/generated/prisma";

// ── Seed helpers ────────────────────────────────────────────────────
const TEST_TAG = `approval-svc-${Date.now()}`;

async function seedUser(role: string) {
  return prisma.user.create({
    data: {
      email: `${role}-${TEST_TAG}@aidflow.test`,
      passwordHash: "irrelevant",
      fullName: `Test ${role}`,
      role: role as UserRole,
      status: "active",
    },
  });
}

// ── Setup / teardown ────────────────────────────────────────────────
let adminId: string;
let controllerId: string;

beforeAll(async () => {
  const [admin, controller] = await Promise.all([
    seedUser("system_admin"),
    seedUser("system_controller"),
  ]);
  adminId = admin.id;
  controllerId = controller.id;
});

afterAll(async () => {
  await prisma.approvalRequest.deleteMany({
    where: { requestedById: { in: [adminId, controllerId] } },
  });
  await prisma.user.deleteMany({
    where: { email: { contains: TEST_TAG } },
  });
});

// ── ApprovalService.request() ───────────────────────────────────────
describe("ApprovalService.request()", () => {
  it("creates a pending approval with assignedToRole from rules", async () => {
    const entityId = `entity-${TEST_TAG}-1`;

    const approvalId = await ApprovalService.request({
      entityType: "allocation",
      entityId,
      action: "approve_allocation",
      requestedById: adminId,
    });

    expect(approvalId).toBeDefined();

    const record = await prisma.approvalRequest.findUnique({
      where: { id: approvalId },
    });
    expect(record).not.toBeNull();
    expect(record!.status).toBe("pending");
    expect(record!.assignedToRole).toBe("system_controller");
    expect(record!.entityType).toBe("allocation");
    expect(record!.entityId).toBe(entityId);
    expect(record!.action).toBe("approve_allocation");
    expect(record!.requestedById).toBe(adminId);
  });

  it("assigns system_admin role for user_activation entity type", async () => {
    const entityId = `entity-${TEST_TAG}-activation`;

    const approvalId = await ApprovalService.request({
      entityType: "user_activation",
      entityId,
      action: "activate_user",
      requestedById: adminId,
    });

    const record = await prisma.approvalRequest.findUnique({
      where: { id: approvalId },
    });
    expect(record!.assignedToRole).toBe("system_admin");
  });

  it("throws ConflictError when a pending approval already exists for the entity", async () => {
    const entityId = `entity-${TEST_TAG}-conflict`;

    // First request succeeds
    await ApprovalService.request({
      entityType: "allocation",
      entityId,
      action: "approve_allocation",
      requestedById: adminId,
    });

    // Second request for same entity must fail
    await expect(
      ApprovalService.request({
        entityType: "allocation",
        entityId,
        action: "approve_allocation",
        requestedById: adminId,
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      statusCode: 409,
    });
  });

  it("throws for unknown entity type", async () => {
    await expect(
      ApprovalService.request({
        entityType: "unknown_type",
        entityId: `entity-${TEST_TAG}-unknown`,
        action: "do_thing",
        requestedById: adminId,
      }),
    ).rejects.toThrow("No approval rule defined for entity type: unknown_type");
  });
});

// ── ApprovalService.resolve() ───────────────────────────────────────
describe("ApprovalService.resolve()", () => {
  it("throws NotFoundError for non-existent approval ID", async () => {
    await expect(
      ApprovalService.resolve({
        approvalId: "00000000-0000-0000-0000-000000000000",
        decision: "approved",
        resolvedById: controllerId,
        resolverRole: "system_controller",
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      statusCode: 404,
    });
  });

  it("throws ConflictError when approval is already resolved", async () => {
    const entityId = `entity-${TEST_TAG}-already-resolved`;

    const approvalId = await ApprovalService.request({
      entityType: "allocation",
      entityId,
      action: "approve_allocation",
      requestedById: adminId,
    });

    // Manually mark as approved to simulate already-resolved state
    await prisma.approvalRequest.update({
      where: { id: approvalId },
      data: { status: "approved" },
    });

    await expect(
      ApprovalService.resolve({
        approvalId,
        decision: "approved",
        resolvedById: controllerId,
        resolverRole: "system_controller",
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      statusCode: 409,
    });
  });

  it("throws AuthorizationError when resolver role does not match assignedToRole", async () => {
    const entityId = `entity-${TEST_TAG}-wrong-role`;

    const approvalId = await ApprovalService.request({
      entityType: "allocation",
      entityId,
      action: "approve_allocation",
      requestedById: adminId,
    });

    // allocation is assigned to system_controller — try to resolve as system_admin
    await expect(
      ApprovalService.resolve({
        approvalId,
        decision: "approved",
        resolvedById: adminId,
        resolverRole: "system_admin",
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      statusCode: 403,
    });
  });

  it("resolves to approved and fires registered callback", async () => {
    const entityId = `entity-${TEST_TAG}-resolve-ok`;
    let callbackFired = false;
    let callbackDecision: string | null = null;

    ApprovalService.registerResolver("allocation", async (id, decision) => {
      callbackFired = true;
      callbackDecision = decision;
    });

    const approvalId = await ApprovalService.request({
      entityType: "allocation",
      entityId,
      action: "approve_allocation",
      requestedById: adminId,
    });

    await ApprovalService.resolve({
      approvalId,
      decision: "approved",
      resolvedById: controllerId,
      resolverRole: "system_controller",
      notes: "Looks good",
    });

    const record = await prisma.approvalRequest.findUnique({
      where: { id: approvalId },
    });
    expect(record!.status).toBe("approved");
    expect(record!.resolvedById).toBe(controllerId);
    expect(record!.resolvedAt).not.toBeNull();
    expect(record!.notes).toBe("Looks good");
    expect(callbackFired).toBe(true);
    expect(callbackDecision).toBe("approved");
  });

  it("resolves to rejected and fires registered callback with rejected decision", async () => {
    const entityId = `entity-${TEST_TAG}-reject-ok`;
    let callbackDecision: string | null = null;

    ApprovalService.registerResolver("allocation", async (id, decision) => {
      callbackDecision = decision;
    });

    const approvalId = await ApprovalService.request({
      entityType: "allocation",
      entityId,
      action: "approve_allocation",
      requestedById: adminId,
    });

    await ApprovalService.resolve({
      approvalId,
      decision: "rejected",
      resolvedById: controllerId,
      resolverRole: "system_controller",
      notes: "Missing documentation",
    });

    const record = await prisma.approvalRequest.findUnique({
      where: { id: approvalId },
    });
    expect(record!.status).toBe("rejected");
    expect(callbackDecision).toBe("rejected");
  });
});

// ── ApprovalService.getQueue() ──────────────────────────────────────
describe("ApprovalService.getQueue()", () => {
  it("returns only approvals assigned to the caller's role", async () => {
    const entityId = `entity-${TEST_TAG}-queue`;

    await ApprovalService.request({
      entityType: "allocation",
      entityId,
      action: "approve_allocation",
      requestedById: adminId,
    });

    const result = await ApprovalService.getQueue({
      role: "system_controller",
      status: "pending",
    });

    expect(result.total).toBeGreaterThanOrEqual(1);
    // Every returned item must be assigned to system_controller
    result.items.forEach((item) => {
      expect(item.assignedToRole).toBe("system_controller");
    });
  });

  it("filters by entityType when provided", async () => {
    const result = await ApprovalService.getQueue({
      role: "system_controller",
      entityType: "allocation",
    });

    result.items.forEach((item) => {
      expect(item.entityType).toBe("allocation");
    });
  });

  it("returns empty list for a role with no pending approvals", async () => {
    const result = await ApprovalService.getQueue({
      role: "ngo",
      status: "pending",
    });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});
