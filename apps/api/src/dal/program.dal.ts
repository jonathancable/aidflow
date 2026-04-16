// apps/api/src/dal/program.dal.ts
import { prisma } from "@/lib/prisma";
import type { Prisma, ProgramStatus } from "@/generated/prisma";

export async function findProgramById(id: string) {
  const [program, wallet] = await prisma.$transaction([
    prisma.program.findUnique({
      where: { id },
      include: { org: { select: { id: true, name: true } } },
    }),
    prisma.wallet.findUnique({
      where: { ownerId: id },
      select: { id: true, balance: true, reservedAmount: true, currency: true },
    }),
  ]);

  if (!program) return null;
  return { ...program, wallet };
}

export async function findPrograms(filters: {
  status?: ProgramStatus;
  orgId?: string;
  region?: string;
  page?: number;
  limit?: number;
}) {
  const { status, orgId, region, page = 1, limit = 20 } = filters;
  const where = {
    ...(status ? { status } : {}),
    ...(orgId ? { orgId } : {}),
    ...(region ? { region } : {}),
  };
  const [programs, total, wallets] = await prisma.$transaction([
    prisma.program.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { org: { select: { id: true, name: true } } },
    }),
    prisma.program.count({ where }),
    prisma.wallet.findMany({
      where: { ownerType: "program" },
      select: { id: true, ownerId: true },
    }),
  ]);

  const walletByProgram = Object.fromEntries(
    wallets.map((w) => [w.ownerId, w.id]),
  );
  const programsWithWallet = programs.map((p) => ({
    ...p,
    walletId: walletByProgram[p.id] ?? null,
  }));
  return { programs: programsWithWallet, total, page, limit };
}

export async function createProgram(data: Prisma.ProgramUncheckedCreateInput) {
  return prisma.program.create({ data });
}

export async function updateProgram(
  id: string,
  data: Prisma.ProgramUpdateInput,
) {
  return prisma.program.update({ where: { id }, data });
}

export async function updateProgramFundedAmount(
  programId: string,
  delta: number,
  tx: Prisma.TransactionClient,
) {
  return tx.program.update({
    where: { id: programId },
    data: { fundedAmount: { increment: delta } },
  });
}
