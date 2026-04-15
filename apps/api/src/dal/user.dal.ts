import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma";

export async function findUserById(id: string) {
  return prisma.user.findUnique({
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
