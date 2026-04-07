import { PrismaClient, UserRole } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Safety guard — seed must never run in production
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed script must not run in production");
  }

  console.log("Seeding AidFlow database...");
  const hash = (p: string) => bcrypt.hashSync(p, 10);

  // 1. System users ─────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin@aidflow.org" },
    update: {},
    create: {
      email: "admin@aidflow.org",
      passwordHash: hash("Admin1234!"),
      fullName: "System Admin",
      role: "system_admin",
      status: "active",
    },
  });

  await prisma.user.upsert({
    where: { email: "controller@aidflow.org" },
    update: {},
    create: {
      email: "controller@aidflow.org",
      passwordHash: hash("Controller1234!"),
      fullName: "System Controller",
      role: "system_controller",
      status: "active",
    },
  });

  // 2. NGO organization + user ──────────────────────────────────
  const ngoOrg = await prisma.organization.upsert({
    where: { id: "seed-ngo-org-001" },
    update: {},
    create: {
      id: "seed-ngo-org-001",
      name: "Hope Foundation",
      type: "ngo",
      verificationStatus: "verified",
      region: "West Africa",
      contactEmail: "ops@hopefoundation.org",
    },
  });

  await prisma.user.upsert({
    where: { email: "ngo@aidflow.org" },
    update: {},
    create: {
      email: "ngo@aidflow.org",
      passwordHash: hash("NGO1234!"),
      fullName: "NGO Manager",
      role: "ngo",
      status: "active",
      orgId: ngoOrg.id,
    },
  });

  // 3. Donor user + wallet ───────────────────────────────────────
  const donor = await prisma.user.upsert({
    where: { email: "donor@aidflow.org" },
    update: {},
    create: {
      email: "donor@aidflow.org",
      passwordHash: hash("Donor1234!"),
      fullName: "Jane Donor",
      role: "donor",
      status: "active",
    },
  });

  await prisma.wallet.upsert({
    where: { ownerId: donor.id },
    update: {},
    create: {
      ownerType: "donor",
      ownerId: donor.id,
      balance: 50000,
      currency: "USD",
    },
  });

  // 4. Program + wallet ─────────────────────────────────────────
  const program = await prisma.program.upsert({
    where: { id: "seed-program-001" },
    update: {},
    create: {
      id: "seed-program-001",
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

  await prisma.wallet.upsert({
    where: { ownerId: program.id },
    update: {},
    create: {
      ownerType: "program",
      ownerId: program.id,
      balance: 0,
      currency: "USD",
    },
  });

  // 5. Vendor organization ──────────────────────────────────────
  await prisma.organization.upsert({
    where: { id: "seed-vendor-org-001" },
    update: {},
    create: {
      id: "seed-vendor-org-001",
      name: "MediSupply Co.",
      type: "vendor",
      verificationStatus: "verified",
      contactEmail: "orders@medisupply.com",
    },
  });

  // 6. Sample beneficiaries (PII pre-encrypted for dev only) ────
  const bens = [
    { id: "seed-ben-001", name: "enc:Amara Diallo", idNum: "enc:GH-001234" },
    { id: "seed-ben-002", name: "enc:Kwame Asante", idNum: "enc:GH-001235" },
    { id: "seed-ben-003", name: "enc:Fatima Toure", idNum: "enc:GH-001236" },
  ];
  for (const b of bens) {
    await prisma.beneficiary.upsert({
      where: { id: b.id },
      update: {},
      create: {
        id: b.id,
        orgId: ngoOrg.id,
        encryptedName: b.name,
        encryptedIdNumber: b.idNum,
        profileData: { region: "West Africa", ageGroup: "child" },
      },
    });
  }

  console.log("Seed complete. Test credentials:");
  console.log("  Admin:      admin@aidflow.org      / Admin1234!");
  console.log("  Controller: controller@aidflow.org / Controller1234!");
  console.log("  Donor:      donor@aidflow.org      / Donor1234!");
  console.log("  NGO:        ngo@aidflow.org        / NGO1234!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
