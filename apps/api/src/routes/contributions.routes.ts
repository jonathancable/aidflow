// apps/api/src/routes/contributions.routes.ts
import { Router } from "express";
import { ContributionService } from "@services/contribution.service";
import { authenticate } from "@middleware/authenticate.middleware";
import { authorize } from "@middleware/authorize.middleware";
import { ValidationError } from "@middleware/errors";
import { z } from "zod";

const router = Router();

const CreateContributionSchema = z.object({
  programId: z.string().uuid(),
  amount: z.number().positive().multipleOf(0.01),
  currency: z.string().length(3).default("USD"),
  notes: z.string().max(500).optional(),
});

// POST /api/v1/contributions  (Donor, Government)
router.post(
  "/",
  authenticate,
  authorize("contributions", "create"),
  async (req, res, next) => {
    try {
      const parsed = CreateContributionSchema.safeParse(req.body);
      if (!parsed.success)
        throw new ValidationError(parsed.error.flatten().fieldErrors);

      const contribution = await ContributionService.create({
        donorId: req.context.userId,
        programId: parsed.data.programId,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
      }, { actorId: req.context.userId, actorRole: req.context.role, ...(req.ip !== undefined ? { ipAddress: req.ip } : {}) });
      return res.status(201).json({ success: true, data: contribution });
    } catch (err) {
      return next(err);
    }
  },
);

// GET /api/v1/contributions
router.get(
  "/",
  authenticate,
  authorize("contributions", "read"),
  async (req, res, next) => {
    try {
      const { page, limit } = req.query;
      // Donors always see only their own; admins can filter by donorId
      const donorId =
        req.context.role === "donor"
          ? req.context.userId
          : ((req.query.donorId as string) ?? req.context.userId);

      const result = await ContributionService.findByDonor(
        donorId,
        page ? Number(page) : 1,
        limit ? Number(limit) : 20,
      );
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

// GET /api/v1/contributions/:id
router.get(
  "/:id",
  authenticate,
  authorize("contributions", "read"),
  async (req, res, next) => {
    try {
      const contribution = await ContributionService.findById(
        req.params.id!,
        req.context.userId,
        req.context.role,
      );
      return res.json({ success: true, data: contribution });
    } catch (err) {
      return next(err);
    }
  },
);

export { router as contributionsRouter };
