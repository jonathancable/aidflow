// apps/api/src/routes/approvals.routes.ts
import { Router } from "express";
import { ApprovalService } from "@services/approval.service";
import { authenticate } from "@middleware/authenticate.middleware";
import { authorize } from "@middleware/authorize.middleware";
import { ValidationError } from "@middleware/errors";
import { z } from "zod";

const router = Router();

const ResolveSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  notes: z.string().max(1000).optional(),
});

// GET /api/v1/approvals — Controller + Admin see their pending queue
router.get(
  "/",
  authenticate,
  authorize("allocations", "approve"),
  async (req, res, next) => {
    try {
      const { status, entityType, page, limit } = req.query;
      const result = await ApprovalService.getQueue({
        role: req.context.role,
        status: status as string,
        entityType: entityType as string,
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

// PATCH /api/v1/approvals/:id — Resolve an approval
router.patch(
  "/:id",
  authenticate,
  authorize("allocations", "approve"),
  async (req, res, next) => {
    try {
      const parsed = ResolveSchema.safeParse(req.body);
      if (!parsed.success)
        throw new ValidationError(parsed.error.flatten().fieldErrors);

      await ApprovalService.resolve({
        approvalId: req.params.id!,
        decision: parsed.data.decision,
        resolvedById: req.context.userId,
        resolverRole: req.context.role,
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
      });

      return res.json({
        success: true,
        data: { message: `Approval ${parsed.data.decision}` },
      });
    } catch (err) {
      return next(err);
    }
  },
);

export { router as approvalsRouter };
