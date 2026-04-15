// apps/api/src/dal/beneficiary.dal.ts
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt, encryptField } from "@/lib/encryption";
import type { Beneficiary, Prisma } from "@/generated/prisma";

// Decrypt PII fields on a raw beneficiary record
function decryptBeneficiary(b: Beneficiary) {
  return {
    ...b,
    fullName: b.encryptedName ? decrypt(b.encryptedName) : null,
    idNumber: b.encryptedIdNumber ? decrypt(b.encryptedIdNumber) : null,
    contact: b.encryptedContact ? decrypt(b.encryptedContact) : null,
    // Remove raw encrypted fields from the output
    encryptedName: undefined,
    encryptedIdNumber: undefined,
    encryptedContact: undefined,
  };
}

export async function createBeneficiary(data: {
  orgId: string;
  fullName: string;
  idNumber?: string | undefined;
  contact?: string | undefined;
  profileData?: Record<string, unknown>;
}) {
  const record = await prisma.beneficiary.create({
    data: {
      orgId: data.orgId,
      encryptedName: encrypt(data.fullName),
      encryptedIdNumber: encryptField(data.idNumber),
      encryptedContact: encryptField(data.contact),
      ...(data.profileData !== undefined ? { profileData: data.profileData as Prisma.InputJsonValue } : {}),
    },
  });
  return decryptBeneficiary(record);
}

export async function findBeneficiaryById(id: string) {
  const b = await prisma.beneficiary.findUnique({ where: { id } });
  if (!b) return null;
  return decryptBeneficiary(b);
}

export async function findBeneficiariesByOrg(
  orgId: string,
  filters: { page?: number; limit?: number; search?: string },
) {
  const { page = 1, limit = 20 } = filters;
  // TODO(tech-debt) Sprint 6 — encrypted field search
  // `search` param is ignored here because name/idNumber are AES-256 encrypted at rest.
  // Searching requires decrypting every row in memory — not viable at scale.
  //
  // Fix: add `encryptedNameHash` and `encryptedIdNumberHash` columns to the `beneficiaries`
  // table (HMAC-SHA256 of lowercased plaintext, using a separate HMAC key from the
  // encryption key). Store the HMAC on write; query with WHERE hash = HMAC(input) on read.
  // This enables exact-match lookup without exposing plaintext.
  //
  // Migration steps:
  //   1. Add nullable columns in a new migration.
  //   2. Backfill: decrypt → HMAC → update (one-time job, run in batches).
  //   3. Add NOT NULL constraint once backfill is complete.
  //   4. Update createBeneficiary() and findBeneficiariesByOrg() to write/query hashes.
  //   5. Add HMAC_KEY to env schema (separate secret from AES_KEY).
  if (filters.search) {
    // eslint-disable-next-line no-console
    console.warn(
      "[beneficiary.dal] search ignored — encrypted field lookup not yet implemented (Sprint 6)",
    );
  }
  const [records, total] = await prisma.$transaction([
    prisma.beneficiary.findMany({
      where: { orgId, isActive: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.beneficiary.count({ where: { orgId, isActive: true } }),
  ]);
  return { items: records.map(decryptBeneficiary), total, page, limit };
}

export async function findBeneficiaryEntitlements(beneficiaryId: string) {
  return prisma.beneficiaryEntitlement.findMany({
    where: { beneficiaryId },
    orderBy: { createdAt: "desc" },
    include: {
      batchItem: {
        include: {
          batch: { include: { program: { select: { id: true, name: true } } } },
        },
      },
    },
  });
}
