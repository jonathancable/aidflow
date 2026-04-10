// apps/api/src/tests/integration/workflow-e2e.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "@/index";
import { prisma } from "@/lib/prisma";

describe("End-to-end: Contribute → Allocate → Approve", () => {
  let donorToken: string;
  let adminToken: string;
  let controllerToken: string;
  let donorWalletId: string;
  let programWalletId: string;
  let programId: string;
  let allocationId: string;
  let approvalId: string;

  beforeAll(async () => {
    // Login all three roles
    const [dRes, aRes, cRes] = await Promise.all([
      request(app)
        .post("/api/v1/auth/login")
        .send({ email: "donor@aidflow.org", password: "Donor1234!" }),
      request(app)
        .post("/api/v1/auth/login")
        .send({ email: "admin@aidflow.org", password: "Admin1234!" }),
      request(app)
        .post("/api/v1/auth/login")
        .send({ email: "controller@aidflow.org", password: "Controller1234!" }),
    ]);
    donorToken = dRes.body.data.accessToken;
    adminToken = aRes.body.data.accessToken;
    controllerToken = cRes.body.data.accessToken;

    // Resolve seed program UUID (slug is not a valid UUID for schema validation)
    const program = await prisma.program.findFirst({
      where: { status: "active" },
    });
    programId = program!.id;

    // Get wallet IDs
    const wallets = await prisma.wallet.findMany({
      where: { ownerType: { in: ["donor", "program"] } },
    });
    donorWalletId = wallets.find((w) => w.ownerType === "donor")!.id;
    programWalletId = wallets.find((w) => w.ownerType === "program")!.id;
  });

  it("donor can contribute to an active program", async () => {
    const res = await request(app)
      .post("/api/v1/contributions")
      .set("Authorization", `Bearer ${donorToken}`)
      .send({ programId: programId, amount: 1000, currency: "USD" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("confirmed");

    // Verify donor wallet balance decreased
    const wallet = await prisma.wallet.findUnique({
      where: { id: donorWalletId },
    });
    expect(Number(wallet!.balance)).toBeLessThan(50000);
  });

  it("admin can create an allocation (returns 202 pending approval)", async () => {
    const res = await request(app)
      .post("/api/v1/allocations")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        programId: programId,
        sourceWalletId: donorWalletId,
        destWalletId: programWalletId,
        amount: 500,
        notes: "E2E test allocation",
      });

    expect(res.status).toBe(202);
    expect(res.body.data.status).toBe("pending_approval");
    allocationId = res.body.data.id;
    approvalId = res.body.meta.approvalId;
    expect(approvalId).toBeDefined();
  });

  it("donor cannot access the approval queue", async () => {
    const res = await request(app)
      .get("/api/v1/approvals")
      .set("Authorization", `Bearer ${donorToken}`);
    expect(res.status).toBe(403);
  });

  it("controller sees the allocation in the approval queue", async () => {
    const res = await request(app)
      .get("/api/v1/approvals?status=pending")
      .set("Authorization", `Bearer ${controllerToken}`);

    expect(res.status).toBe(200);
    const pending = (res.body.data as { id: string; entityType: string }[]).find((a) => a.id === approvalId);
    expect(pending).toBeDefined();
    expect(pending!.entityType).toBe("allocation");
  });

  it("controller approves the allocation — funds move to program wallet", async () => {
    const programWalletBefore = await prisma.wallet.findUnique({
      where: { id: programWalletId },
    });
    const beforeBalance = Number(programWalletBefore!.balance);

    const res = await request(app)
      .patch(`/api/v1/approvals/${approvalId}`)
      .set("Authorization", `Bearer ${controllerToken}`)
      .send({ decision: "approved", notes: "Verified — approved" });

    expect(res.status).toBe(200);

    // Verify program wallet received the funds
    const programWalletAfter = await prisma.wallet.findUnique({
      where: { id: programWalletId },
    });
    expect(Number(programWalletAfter!.balance)).toBe(beforeBalance + 500);

    // Verify allocation status updated
    const allocation = await prisma.allocation.findUnique({
      where: { id: allocationId },
    });
    expect(allocation!.status).toBe("approved");

    // Verify ledger entry was created
    const entry = await prisma.ledgerEntry.findFirst({
      where: { referenceId: allocationId, referenceType: "allocation" },
    });
    expect(entry).not.toBeNull();
    expect(Number(entry!.amount)).toBe(500);
  });

  it("approved allocation cannot be approved again", async () => {
    const res = await request(app)
      .patch(`/api/v1/approvals/${approvalId}`)
      .set("Authorization", `Bearer ${controllerToken}`)
      .send({ decision: "approved" });

    expect(res.status).toBe(409);
  });
});
