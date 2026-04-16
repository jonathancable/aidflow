import { PrismaClient, UserRole } from "../src/generated/prisma";
import bcrypt from "bcryptjs";
import { encrypt } from "../src/lib/encryption";

const prisma = new PrismaClient();

// Deterministic UUIDs for stable seed references across resets
const SEED = {
  ngoOrg:    "00000000-0000-4000-8000-000000000001",
  vendorOrg: "00000000-0000-4000-8000-000000000002",
  program:   "00000000-0000-4000-8000-000000000010",
  ben001:    "00000000-0000-4000-8000-000000000020",
  ben002:    "00000000-0000-4000-8000-000000000021",
  ben003:    "00000000-0000-4000-8000-000000000022",
} as const;

async function main() {
  // Safety guard — seed must never run in production
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed script must not run in production");
  }

  console.log("Seeding AidFlow database...");
  const hash = (p: string) => bcrypt.hashSync(p, 10);

  // Wipe all data so re-runs start clean (dev / test environments only)
  await prisma.$executeRaw`
    TRUNCATE TABLE
      notifications, audit_logs, approval_requests, settlements, vendor_orders,
      beneficiary_entitlements, batch_items, distribution_batches, ledger_entries,
      allocations, contributions, program_milestones, wallets, programs, beneficiaries,
      refresh_tokens, users, organizations
    CASCADE
  `;

  // 1. System users ─────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      email: "admin@aidflow.org",
      passwordHash: hash("Admin1234!"),
      fullName: "System Admin",
      role: "system_admin",
      status: "active",
    },
  });

  await prisma.user.create({
    data: {
      email: "controller@aidflow.org",
      passwordHash: hash("Controller1234!"),
      fullName: "System Controller",
      role: "system_controller",
      status: "active",
    },
  });

  // 2. NGO organization + user ──────────────────────────────────
  const ngoOrg = await prisma.organization.create({
    data: {
      id: SEED.ngoOrg,
      name: "Hope Foundation",
      type: "ngo",
      verificationStatus: "verified",
      region: "West Africa",
      contactEmail: "ops@hopefoundation.org",
    },
  });

  await prisma.user.create({
    data: {
      email: "ngo@aidflow.org",
      passwordHash: hash("NGO1234!"),
      fullName: "NGO Manager",
      role: "ngo",
      status: "active",
      orgId: ngoOrg.id,
    },
  });

  // 3. Donor user + wallet ───────────────────────────────────────
  const donor = await prisma.user.create({
    data: {
      email: "donor@aidflow.org",
      passwordHash: hash("Donor1234!"),
      fullName: "Jane Donor",
      role: "donor",
      status: "active",
    },
  });

  // System wallet — debit side for seed opening-balance entries (balance stays at 0 by convention)
  const systemWallet = await prisma.wallet.create({
    data: {
      ownerType: "system_treasury",
      ownerId: admin.id,
      balance: 0,
      currency: "USD",
    },
  });

  const donorWallet = await prisma.wallet.create({
    data: {
      ownerType: "donor",
      ownerId: donor.id,
      balance: 50000,
      currency: "USD",
    },
  });

  // Seed the donor's opening balance via a ledger entry so wallet reconciliation passes
  await prisma.ledgerEntry.create({
    data: {
      debitWalletId: systemWallet.id,
      creditWalletId: donorWallet.id,
      amount: 50000,
      currency: "USD",
      referenceType: "seed",
      referenceId: "SEED_OPENING_BALANCE",
      description: "Seed opening balance",
      createdBy: admin.id,
    },
  });

  // 4. Program + wallet ─────────────────────────────────────────
  const program = await prisma.program.create({
    data: {
      id: SEED.program,
      name: "West Africa School Feeding Initiative",
      type: "feeding",
      status: "active",
      budgetTarget: 100000,
      fundedAmount: 0,
      region: "West Africa",
      orgId: ngoOrg.id,
      createdBy: admin.id,
    },
  });

  await prisma.wallet.create({
    data: {
      ownerType: "program",
      ownerId: program.id,
      balance: 0,
      currency: "USD",
    },
  });

  // 5. Vendor organization ──────────────────────────────────────
  await prisma.organization.create({
    data: {
      id: SEED.vendorOrg,
      name: "MediSupply Co.",
      type: "vendor",
      verificationStatus: "verified",
      contactEmail: "orders@medisupply.com",
    },
  });

  // 6. Sample beneficiaries — PII encrypted via AES-256-GCM on write ────
  const bens = [
    { id: SEED.ben001, name: "Amara Diallo", idNum: "GH-001234" },
    { id: SEED.ben002, name: "Kwame Asante", idNum: "GH-001235" },
    { id: SEED.ben003, name: "Fatima Toure", idNum: "GH-001236" },
  ];
  for (const b of bens) {
    await prisma.beneficiary.create({
      data: {
        id: b.id,
        orgId: ngoOrg.id,
        encryptedName: encrypt(b.name),
        encryptedIdNumber: encrypt(b.idNum),
        profileData: { region: "West Africa", ageGroup: "child" },
      },
    });
  }

  console.log("Seed complete. Test credentials:");
  console.log("  Admin:      admin@aidflow.org      / Admin1234!");
  console.log("  Controller: controller@aidflow.org / Controller1234!");
  console.log("  Donor:      donor@aidflow.org      / Donor1234!");
  console.log("  NGO:        ngo@aidflow.org        / NGO1234!");
  console.log(`  Program ID: ${SEED.program}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
