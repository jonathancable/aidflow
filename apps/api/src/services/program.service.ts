// apps/api/src/services/program.service.ts
import { prisma } from "@/lib/prisma";
import { findProgramById, updateProgram } from "@dal/program.dal";
import { NotFoundError } from "@middleware/errors";
import { ProgramStatus } from "@/generated/prisma";

export const ProgramService = {
  async create(data: {
    name: string;
    type: string;
    budgetTarget: number;
    region?: string | undefined;
    description?: string | undefined;
    orgId: string;
    createdBy: string;
  }) {
    // Program + its wallet created atomically
    return prisma.$transaction(async (tx) => {
      const { region, description, ...rest } = data;
      const program = await tx.program.create({
        data: {
          ...rest,
          region: region ?? null,
          description: description ?? null,
          status: "draft",
          fundedAmount: 0,
        },
      });

      // Every program gets exactly one wallet at creation
      await tx.wallet.create({
        data: {
          ownerType: "program",
          ownerId: program.id,
          balance: 0,
          currency: "USD",
        },
      });

      return program;
    });
  },

  async getById(id: string) {
    const program = await findProgramById(id);
    if (!program) throw new NotFoundError("Program");
    return program;
  },

  async getFundingStatus(programId: string) {
    const program = await findProgramById(programId);
    if (!program) throw new NotFoundError("Program");

    const wallet = program.wallet;
    const target = Number(program.budgetTarget);
    const funded = Number(program.fundedAmount);
    const balance = wallet ? Number(wallet.balance) : 0;
    const reserved = wallet ? Number(wallet.reservedAmount) : 0;

    return {
      programId,
      programName: program.name,
      budgetTarget: target,
      fundedAmount: funded,
      fundingProgress: target > 0 ? Math.round((funded / target) * 100) : 0,
      walletBalance: balance,
      walletReserved: reserved,
      walletAvailable: balance - reserved,
      currency: wallet?.currency ?? "USD",
      status: program.status,
    };
  },

  async updateStatus(programId: string, status: string) {
    const program = await findProgramById(programId);
    if (!program) throw new NotFoundError("Program");
    return updateProgram(programId, { status: status as ProgramStatus });
  },
};
