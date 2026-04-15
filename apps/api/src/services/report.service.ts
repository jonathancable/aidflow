// apps/api/src/services/report.service.ts
import { prisma } from "@/lib/prisma";
import { AuditService } from "@services/audit.service";
import type { BatchStatus, SettlementStatus } from "@/generated/prisma";

export const ReportService = {
  // Platform-wide summary — Admins and Controllers
  async getPlatformSummary() {
    const [
      totalContributions,
      totalAllocated,
      totalDistributed,
      activePrograms,
      beneficiaryCount,
      pendingApprovals,
    ] = await prisma.$transaction([
      prisma.contribution.aggregate({ _sum: { amount: true }, where: { status: "confirmed" } }),
      prisma.allocation.aggregate({ _sum: { amount: true }, where: { status: "approved" } }),
      prisma.distributionBatch.aggregate({ _sum: { totalAmount: true }, where: { status: { in: ["released", "completed"] as BatchStatus[] } } }),
      prisma.program.count({ where: { status: "active" } }),
      prisma.beneficiary.count({ where: { isActive: true } }),
      prisma.approvalRequest.count({ where: { status: "pending" } }),
    ]);
    return {
      totalContributions: Number(totalContributions._sum.amount ?? 0),
      totalAllocated: Number(totalAllocated._sum.amount ?? 0),
      totalDistributed: Number(totalDistributed._sum.totalAmount ?? 0),
      activePrograms,
      beneficiaryCount,
      pendingApprovals,
    };
  },

  // Donor impact report — scoped to one donor
  async getDonorImpact(donorId: string) {
    const contributions = await prisma.contribution.findMany({
      where: { donorId, status: "confirmed" },
      include: { program: { select: { id: true, name: true, status: true } } },
      orderBy: { createdAt: "desc" },
    });

    const totalContributed = contributions.reduce((s, c) => s + Number(c.amount), 0);

    // For each program contributed to, get funding progress
    const programIds = [...new Set(contributions.map((c) => c.programId))];
    const programs = await prisma.program.findMany({
      where: { id: { in: programIds } },
    });

    return {
      donorId,
      totalContributed,
      contributionCount: contributions.length,
      programs: programs.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        budgetTarget: Number(p.budgetTarget),
        fundedAmount: Number(p.fundedAmount),
        fundingProgress:
          Number(p.budgetTarget) > 0
            ? Math.round((Number(p.fundedAmount) / Number(p.budgetTarget)) * 100)
            : 0,
      })),
      contributions: contributions.map((c) => ({
        id: c.id,
        programId: c.programId,
        programName: c.program.name,
        amount: Number(c.amount),
        currency: c.currency,
        confirmedAt: c.confirmedAt,
      })),
    };
  },

  // Distribution report — by region or program
  async getDistributionReport(filters: {
    programId?: string;
    region?: string;
    from?: Date;
    to?: Date;
  }) {
    const where = {
      ...(filters.programId ? { programId: filters.programId } : {}),
      status: { in: ["released", "completed"] as BatchStatus[] },
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    };
    const batches = await prisma.distributionBatch.findMany({
      where,
      include: {
        program: { select: { id: true, name: true, region: true } },
        items: {
          where: { status: "confirmed" },
          select: { entitlementAmount: true, confirmedAt: true },
        },
      },
    });
    return batches.map((b) => ({
      batchId: b.id,
      programId: b.programId,
      programName: b.program.name,
      region: b.program.region,
      totalAmount: Number(b.totalAmount),
      beneficiaryCount: b.beneficiaryCount,
      confirmedCount: b.items.length,
      confirmedAmount: b.items.reduce((s, i) => s + Number(i.entitlementAmount), 0),
      completionRate:
        b.beneficiaryCount > 0
          ? Math.round((b.items.length / b.beneficiaryCount) * 100)
          : 0,
      status: b.status,
      releasedAt: b.releasedAt,
    }));
  },

  // Vendor settlement report
  async getVendorSettlementReport(filters: { vendorOrgId?: string; status?: string }) {
    const where = {
      ...(filters.status ? { status: filters.status as SettlementStatus } : {}),
      ...(filters.vendorOrgId ? { vendorOrder: { vendorOrgId: filters.vendorOrgId } } : {}),
    };
    return prisma.settlement.findMany({
      where,
      include: {
        vendorOrder: { include: { vendorOrg: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  // Generate CSV export for a report type
  async generateCsv(
    reportType: string,
    filters: { from: Date; to: Date; entityType?: string },
  ): Promise<string> {
    let rows: Record<string, unknown>[] = [];
    switch (reportType) {
      case "distribution":
        rows = await ReportService.getDistributionReport({
          ...(filters.entityType ? { programId: filters.entityType } : {}),
        });
        break;
      case "audit": {
        const audit = await AuditService.export({
          from: filters.from,
          to: filters.to,
          ...(filters.entityType ? { entityType: filters.entityType } : {}),
        });
        rows = audit.map((e) => ({
          timestamp: e.createdAt,
          actorId: e.actorId,
          role: e.actorRole,
          action: e.action,
          entityType: e.entityType,
          entityId: e.entityId,
        }));
        break;
      }
      default:
        rows = [];
    }
    if (rows.length === 0) return "";
    const firstRow = rows[0];
    if (firstRow === undefined) return "";
    const headers = Object.keys(firstRow).join(",");
    const dataRows = rows.map((r) =>
      Object.values(r)
        .map((v) => JSON.stringify(v ?? ""))
        .join(","),
    );
    return [headers, ...dataRows].join("\n");
  },
};
