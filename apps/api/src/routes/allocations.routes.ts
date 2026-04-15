// apps/api/src/routes/allocations.routes.ts
import { Router } from "express";
import { AllocationService } from "@services/allocation.service";
import { authenticate } from "@middleware/authenticate.middleware";
import { authorize } from "@middleware/authorize.middleware";
import { ValidationError } from "@middleware/errors";
import { z } from "zod";

const router = Router();

const CreateAllocationSchema = z.object({
  programId: z.string().uuid(),
  sourceWalletId: z.string().uuid(),
  destWalletId: z.string().uuid(),
  amount: z.number().positive().multipleOf(0.01),
  currency: z.string().length(3).default("USD"),
  notes: z.string().max(1000).optional(),
});

const ReverseSchema = z.object({
  reason: z.string().min(10).max(500),
});

// GET /api/v1/allocations
router.get(
  "/",
  authenticate,
  authorize("allocations", "read"),
  async (req, res, next) => {
    try {
      const { programId, status, page, limit } = req.query;
      const result = await AllocationService.findAll({
        programId: programId as string,
        status: status as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });
      return res.json({
        success: true,
        data: result.items,
        meta: { total: result.total, page: result.page, limit: result.limit },
      });
    } catch (err) {
      return next(err);
    }
  },
);

// GET /api/v1/allocations/:id
router.get(
  "/:id",
  authenticate,
  authorize("allocations", "read"),
  async (req, res, next) => {
    try {
      const allocation = await AllocationService.findById(req.params.id!);
      return res.json({ success: true, data: allocation });
    } catch (err) {
      return next(err);
    }
  },
);

// POST /api/v1/allocations  (Admin)
router.post(
  "/",
  authenticate,
  authorize("allocations", "create"),
  async (req, res, next) => {
    try {
      const parsed = CreateAllocationSchema.safeParse(req.body);
      if (!parsed.success)
        throw new ValidationError(parsed.error.flatten().fieldErrors);

      const result = await AllocationService.create({
        programId: parsed.data.programId,
        sourceWalletId: parsed.data.sourceWalletId,
        destWalletId: parsed.data.destWalletId,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        requestedBy: req.context.userId,
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
      }, { actorId: req.context.userId, actorRole: req.context.role, ...(req.ip !== undefined ? { ipAddress: req.ip } : {}) });
      // 202 Accepted — the allocation is pending approval, not complete
      return res.status(202).json({
        success: true,
        data: result.allocation,
        meta: {
          approvalId: result.approvalId,
          message: "Allocation submitted for Controller approval",
        },
      });
    } catch (err) {
      return next(err);
    }
  },
);

// POST /api/v1/allocations/:id/reverse  (Admin, Controller)
router.post(
  "/:id/reverse",
  authenticate,
  authorize("allocations", "approve"),
  async (req, res, next) => {
    try {
      const parsed = ReverseSchema.safeParse(req.body);
      if (!parsed.success)
        throw new ValidationError(parsed.error.flatten().fieldErrors);

      const reversed = await AllocationService.reverse(
        req.params.id!,
        parsed.data.reason,
        req.context.userId,
        { actorId: req.context.userId, actorRole: req.context.role, ...(req.ip !== undefined ? { ipAddress: req.ip } : {}) },
      );
      return res.json({ success: true, data: reversed });
    } catch (err) {
      return next(err);
    }
  },
);

export { router as allocationsRouter };
