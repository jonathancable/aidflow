// apps/api/src/routes/distribution.routes.ts
import { Router } from "express";
import { BatchService } from "@services/batch.service";
import { authenticate } from "@middleware/authenticate.middleware";
import { authorize } from "@middleware/authorize.middleware";
import { ValidationError, NotFoundError } from "@middleware/errors";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { type Prisma, BatchStatus } from "@/generated/prisma";

const router = Router();

const CreateBatchSchema = z.object({
  programId: z.string().uuid(),
  totalAmount: z.number().positive(),
  notes: z.string().max(1000).optional(),
});

const AddItemsSchema = z.object({
  items: z
    .array(
      z.object({
        beneficiaryId: z.string().uuid(),
        entitlementAmount: z.number().positive().multipleOf(0.01),
      }),
    )
    .min(1)
    .max(500),
});

const ConfirmDeliverySchema = z.object({
  deliveryProofUrl: z.string().url().max(500),
});

// POST /api/v1/distribution/batches
router.post(
  "/batches",
  authenticate,
  authorize("distribution", "create"),
  async (req, res, next) => {
    try {
      const parsed = CreateBatchSchema.safeParse(req.body);
      if (!parsed.success)
        throw new ValidationError(parsed.error.flatten().fieldErrors);
      const batch = await BatchService.create({
        ...parsed.data,
        ngoOrgId: req.context.orgId ?? "",
        submittedBy: req.context.userId,
      });
      return res.status(201).json({ success: true, data: batch });
    } catch (err) {
      return next(err);
    }
  },
);

// GET /api/v1/distribution/batches
router.get(
  "/batches",
  authenticate,
  authorize("distribution", "read"),
  async (req, res, next) => {
    try {
      const { programId, status, page, limit } = req.query;
      const where: Prisma.DistributionBatchWhereInput = {};
      if (programId) where.programId = programId as string;
      if (status) where.status = status as BatchStatus;
      if (req.context.role === "ngo") where.ngoOrgId = req.context.orgId ?? "";
      const [batches, total] = await prisma.$transaction([
        prisma.distributionBatch.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: page ? (Number(page) - 1) * Number(limit || 20) : 0,
          take: Number(limit || 20),
          include: { program: { select: { id: true, name: true } } },
        }),
        prisma.distributionBatch.count({ where }),
      ]);
      return res.json({
        success: true,
        data: batches,
        meta: { total, page: Number(page || 1), limit: Number(limit || 20) },
      });
    } catch (err) {
      return next(err);
    }
  },
);

// GET /api/v1/distribution/batches/:id
router.get(
  "/batches/:id",
  authenticate,
  authorize("distribution", "read"),
  async (req, res, next) => {
    try {
      const batch = await BatchService.findById(req.params.id!);
      return res.json({ success: true, data: batch });
    } catch (err) {
      return next(err);
    }
  },
);

// POST /api/v1/distribution/batches/:id/items
router.post(
  "/batches/:id/items",
  authenticate,
  authorize("distribution", "create"),
  async (req, res, next) => {
    try {
      const parsed = AddItemsSchema.safeParse(req.body);
      if (!parsed.success)
        throw new ValidationError(parsed.error.flatten().fieldErrors);
      const batch = await BatchService.addItems(
        req.params.id!,
        parsed.data.items,
      );
      return res.json({ success: true, data: batch });
    } catch (err) {
      return next(err);
    }
  },
);

// POST /api/v1/distribution/batches/:id/submit
router.post(
  "/batches/:id/submit",
  authenticate,
  authorize("distribution", "create"),
  async (req, res, next) => {
    try {
      const result = await BatchService.submit(
        req.params.id!,
        req.context.userId,
      );
      return res.status(202).json({
        success: true,
        data: result,
        meta: { message: "Batch submitted for Controller approval" },
      });
    } catch (err) {
      return next(err);
    }
  },
);

// PATCH /api/v1/distribution/batches/:batchId/items/:itemId/confirm
router.patch(
  "/batches/:batchId/items/:itemId/confirm",
  authenticate,
  authorize("distribution", "update"),
  async (req, res, next) => {
    try {
      const parsed = ConfirmDeliverySchema.safeParse(req.body);
      if (!parsed.success)
        throw new ValidationError(parsed.error.flatten().fieldErrors);

      const itemId = req.params.itemId!;
      const batchId = req.params.batchId!;

      const item = await prisma.batchItem.findUnique({
        where: { id: itemId },
      });
      if (!item) throw new NotFoundError("Batch item");

      const updated = await prisma.$transaction(async (tx) => {
        const u = await tx.batchItem.update({
          where: { id: itemId },
          data: {
            status: "confirmed",
            deliveryProofUrl: parsed.data.deliveryProofUrl,
            confirmedAt: new Date(),
          },
        });
        if (item.entitlementAmount) {
          await tx.beneficiaryEntitlement.updateMany({
            where: { batchItemId: itemId },
            data: { fulfilledAt: new Date() },
          });
        }
        // Check if all items confirmed — update batch to completed
        const remaining = await tx.batchItem.count({
          where: { batchId, status: { not: "confirmed" } },
        });
        if (remaining === 0) {
          await tx.distributionBatch.update({
            where: { id: batchId },
            data: { status: "completed", completedAt: new Date() },
          });
        }
        return u;
      });
      return res.json({ success: true, data: updated });
    } catch (err) {
      return next(err);
    }
  },
);

export { router as distributionRouter };
