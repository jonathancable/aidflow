// apps/api/src/routes/reports.routes.ts
import { Router } from "express";
import { ReportService } from "@services/report.service";
import { AuditService } from "@services/audit.service";
import { authenticate } from "@middleware/authenticate.middleware";
import { authorize } from "@middleware/authorize.middleware";
import { ValidationError } from "@middleware/errors";

const router = Router();

// GET /api/v1/reports/summary  (Admin, Controller)
router.get(
  "/summary",
  authenticate,
  authorize("reports", "read"),
  async (req, res, next) => {
    try {
      const summary = await ReportService.getPlatformSummary();
      return res.json({ success: true, data: summary });
    } catch (err) {
      return next(err);
    }
  },
);

// GET /api/v1/reports/donor-impact  (Donor sees own; Admin sees any donorId)
router.get(
  "/donor-impact",
  authenticate,
  authorize("reports", "read"),
  async (req, res, next) => {
    try {
      const donorId =
        req.context.role === "donor"
          ? req.context.userId
          : ((req.query.donorId as string) ?? req.context.userId);
      const report = await ReportService.getDonorImpact(donorId);
      return res.json({ success: true, data: report });
    } catch (err) {
      return next(err);
    }
  },
);

// GET /api/v1/reports/distribution
router.get(
  "/distribution",
  authenticate,
  authorize("reports", "read"),
  async (req, res, next) => {
    try {
      const { programId, region, from, to } = req.query;
      const report = await ReportService.getDistributionReport({
        ...(programId ? { programId: programId as string } : {}),
        ...(region ? { region: region as string } : {}),
        ...(from ? { from: new Date(from as string) } : {}),
        ...(to ? { to: new Date(to as string) } : {}),
      });
      return res.json({ success: true, data: report });
    } catch (err) {
      return next(err);
    }
  },
);

// GET /api/v1/reports/audit  (Admin, Controller only)
router.get(
  "/audit",
  authenticate,
  authorize("audit", "read"),
  async (req, res, next) => {
    try {
      const { entityType, entityId, actorId, action, from, to, page, limit } = req.query;
      const result = await AuditService.query({
        ...(entityType ? { entityType: entityType as string } : {}),
        ...(entityId ? { entityId: entityId as string } : {}),
        ...(actorId ? { actorId: actorId as string } : {}),
        ...(action ? { action: action as string } : {}),
        ...(from ? { from: new Date(from as string) } : {}),
        ...(to ? { to: new Date(to as string) } : {}),
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 50,
      });
      return res.json({
        success: true,
        data: result.entries,
        meta: { total: result.total, page: result.page, limit: result.limit },
      });
    } catch (err) {
      return next(err);
    }
  },
);

// GET /api/v1/reports/export?type=distribution&format=csv
router.get(
  "/export",
  authenticate,
  authorize("reports", "export"),
  async (req, res, next) => {
    try {
      const { type, from, to, entityType } = req.query;
      if (!type) throw new ValidationError({ type: ["Report type is required"] });
      if (!from || !to)
        throw new ValidationError({ date: ["from and to dates are required for export"] });

      const csv = await ReportService.generateCsv(type as string, {
        from: new Date(from as string),
        to: new Date(to as string),
        ...(entityType ? { entityType: entityType as string } : {}),
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="aidflow-report.csv"');
      return res.send(csv);
    } catch (err) {
      return next(err);
    }
  },
);

export { router as reportsRouter };
