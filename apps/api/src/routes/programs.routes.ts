// apps/api/src/routes/programs.routes.ts
import { Router } from "express";
import { ProgramService } from "@services/program.service";
import { findPrograms } from "@dal/program.dal";
import { authenticate } from "@middleware/authenticate.middleware";
import { authorize } from "@middleware/authorize.middleware";
import { ValidationError } from "@middleware/errors";
import { z } from "zod";
import type { ProgramStatus } from "@/generated/prisma";

const router = Router();

const CreateProgramSchema = z.object({
  name: z.string().min(3).max(200),
  type: z.string().min(2).max(50),
  budgetTarget: z.number().positive(),
  region: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
});

// GET /api/v1/programs
router.get(
  "/",
  authenticate,
  authorize("programs", "read"),
  async (req, res, next) => {
    try {
      const { status, orgId, region, page, limit } = req.query;
      // NGO users see only their org's programs
      const scopedOrgId =
        req.context.role === "ngo"
          ? (req.context.orgId ?? undefined)
          : (orgId as string | undefined);

      const result = await findPrograms({
        status: status as ProgramStatus,
        ...(scopedOrgId !== undefined ? { orgId: scopedOrgId } : {}),
        ...(region ? { region: region as string } : {}),
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });
      return res.json({
        success: true,
        data: result.programs,
        meta: { total: result.total, page: result.page, limit: result.limit },
      });
    } catch (err) {
      return next(err);
    }
  },
);

// GET /api/v1/programs/:id
router.get(
  "/:id",
  authenticate,
  authorize("programs", "read"),
  async (req, res, next) => {
    try {
      const program = await ProgramService.getById(req.params.id!);
      return res.json({ success: true, data: program });
    } catch (err) {
      return next(err);
    }
  },
);

// GET /api/v1/programs/:id/funding-status
router.get(
  "/:id/funding-status",
  authenticate,
  authorize("programs", "read"),
  async (req, res, next) => {
    try {
      const status = await ProgramService.getFundingStatus(req.params.id!);
      return res.json({ success: true, data: status });
    } catch (err) {
      return next(err);
    }
  },
);

// POST /api/v1/programs  (Admin, Government)
router.post(
  "/",
  authenticate,
  authorize("programs", "create"),
  async (req, res, next) => {
    try {
      const parsed = CreateProgramSchema.safeParse(req.body);
      if (!parsed.success)
        throw new ValidationError(parsed.error.flatten().fieldErrors);

      const program = await ProgramService.create({
        ...parsed.data,
        orgId: req.context.orgId ?? "",
        createdBy: req.context.userId,
      });
      return res.status(201).json({ success: true, data: program });
    } catch (err) {
      return next(err);
    }
  },
);

// PATCH /api/v1/programs/:id/status  (Admin)
router.patch(
  "/:id/status",
  authenticate,
  authorize("programs", "update"),
  async (req, res, next) => {
    try {
      const { status } = req.body;
      if (!status)
        throw new ValidationError({ status: ["Status is required"] });
      const updated = await ProgramService.updateStatus(req.params.id!, status);
      return res.json({ success: true, data: updated });
    } catch (err) {
      return next(err);
    }
  },
);

export { router as programsRouter };
