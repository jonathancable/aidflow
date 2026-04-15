// apps/api/src/tests/integration/workflow-e2e.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "@/index";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Unique tag per run so this test is fully self-contained and never
// depends on the seed script having run beforehand.
const TAG = `e2e-${Date.now()}`;
const PASSWORD = "E2eTest1234!";

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
    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    // Create isolated test users for this run
    const [admin, , donor] = await Promise.all([
      prisma.user.create({
        data: {
          email: `admin-${TAG}@aidflow.test`,
          passwordHash,
          fullName: "E2E Admin",
          role: "system_admin",
          status: "active",
        },
      }),
      prisma.user.create({
        data: {
          email: `controller-${TAG}@aidflow.test`,
          passwordHash,
          fullName: "E2E Controller",
          role: "system_controller",
          status: "active",
        },
      }),
      prisma.user.create({
        data: {
          email: `donor-${TAG}@aidflow.test`,
          passwordHash,
          fullName: "E2E Donor",
          role: "donor",
          status: "active",
        },
      }),
    ]);

    // Create NGO org and active program
    const org = await prisma.organization.create({
      data: {
        name: `E2E Org ${TAG}`,
        type: "ngo",
        verificationStatus: "verified",
        region: "Test Region",
        contactEmail: `org-${TAG}@aidflow.test`,
      },
    });

    const program = await prisma.program.create({
      data: {
        name: `E2E Program ${TAG}`,
        type: "feeding",
        status: "active",
        budgetTarget: 100000,
        fundedAmount: 0,
        region: "Test Region",
        orgId: org.id,
        createdBy: admin.id,
      },
    });
    programId = program.id;

    // Create donor wallet (balance: 50,000) and program wallet (balance: 0)
    const [donorWallet, programWallet] = await Promise.all([
      prisma.wallet.create({
        data: {
          ownerType: "donor",
          ownerId: donor.id,
          balance: 50000,
          currency: "USD",
        },
      }),
      prisma.wallet.create({
        data: {
          ownerType: "program",
          ownerId: program.id,
          balance: 0,
          currency: "USD",
        },
      }),
    ]);
    donorWalletId = donorWallet.id;
    programWalletId = programWallet.id;

    // Log in all three roles
    const [dRes, aRes, cRes] = await Promise.all([
      request(app)
        .post("/api/v1/auth/login")
        .send({ email: `donor-${TAG}@aidflow.test`, password: PASSWORD }),
      request(app)
        .post("/api/v1/auth/login")
        .send({ email: `admin-${TAG}@aidflow.test`, password: PASSWORD }),
      request(app)
        .post("/api/v1/auth/login")
        .send({ email: `controller-${TAG}@aidflow.test`, password: PASSWORD }),
    ]);
    donorToken = dRes.body.data.accessToken;
    adminToken = aRes.body.data.accessToken;
    controllerToken = cRes.body.data.accessToken;
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
