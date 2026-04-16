import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma";

export async function findUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      status: true,
      orgId: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
  if (!user) return null;
  const wallet = await prisma.wallet.findFirst({
    where: { ownerId: id, ownerType: "donor" },
    select: { id: true },
  });
  return { ...user, walletId: wallet?.id ?? null };
}

// Only used by AuthService — never expose passwordHash elsewhere
export async function findUserByEmailWithPassword(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      role: true,
      status: true,
      orgId: true,
    },
  });
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  orgId?: string;
}) {
  return prisma.user.create({
    data: {
      ...data,
      email: data.email.toLowerCase().trim(),
      status: "pending",
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });
}

export async function updateUserStatus(id: string, status: string) {
  return prisma.user.update({ where: { id }, data: { status } });
}

export async function updateLastLogin(id: string) {
  return prisma.user.update({
    where: { id },
    data: { lastLoginAt: new Date() },
  });
}

export async function findAllUsers(params: {
  page?: number;
  limit?: number;
  status?: string;
  role?: UserRole;
}) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 50;
  const where = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.role ? { role: params.role } : {}),
  };
  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        orgId: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);
  return { users, total, page, limit };
}

export async function findUsersByOrg(
  orgId: string,
  filters?: { role?: UserRole; status?: string },
) {
  return prisma.user.findMany({
    where: { orgId, ...filters },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
