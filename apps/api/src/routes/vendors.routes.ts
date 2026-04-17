// apps/api/src/routes/vendors.routes.ts
import { Router } from "express";
import { VendorService } from "@services/vendor.service";
import { authenticate } from "@middleware/authenticate.middleware";
import { authorize } from "@middleware/authorize.middleware";
import { ValidationError } from "@middleware/errors";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const router = Router();

const CreateOrderSchema = z.object({
  vendorOrgId: z.string().uuid(),
  batchId: z.string().uuid(),
  programId: z.string().uuid(),
  items: z
    .array(
      z.object({
        description: z.string().max(200),
        quantity: z.number().int().positive(),
        unitPrice: z.number().positive().multipleOf(0.01),
      }),
    )
    .min(1),
  totalValue: z.number().positive().multipleOf(0.01),
});

const DeliverSchema = z.object({
  deliveryProofUrl: z.string().url().max(500),
});

// GET /api/v1/vendors/orgs — list vendor-type organizations
router.get(
  "/orgs",
  authenticate,
  authorize("vendors", "read"),
  async (_req, res, next) => {
    try {
      const orgs = await prisma.organization.findMany({
        where: { type: "vendor" },
        select: { id: true, name: true, region: true },
        orderBy: { name: "asc" },
      });
      return res.json({ success: true, data: orgs });
    } catch (err) {
      return next(err);
    }
  },
);

// POST /api/v1/vendors/orders
router.post(
  "/orders",
  authenticate,
  authorize("vendors", "create"),
  async (req, res, next) => {
    try {
      const parsed = CreateOrderSchema.safeParse(req.body);
      if (!parsed.success)
        throw new ValidationError(parsed.error.flatten().fieldErrors);
      const order = await VendorService.createOrder({
        ...parsed.data,
        issuedBy: req.context.userId,
      });
      return res.status(201).json({ success: true, data: order });
    } catch (err) {
      return next(err);
    }
  },
);

// GET /api/v1/vendors/orders
router.get(
  "/orders",
  authenticate,
  authorize("vendors", "read"),
  async (req, res, next) => {
    try {
      const where =
        req.context.role === "vendor"
          ? { vendorOrgId: req.context.orgId ?? "" }
          : {};
      const [orders, total] = await prisma.$transaction([
        prisma.vendorOrder.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { settlement: true },
        }),
        prisma.vendorOrder.count({ where }),
      ]);
      return res.json({ success: true, data: orders, meta: { total } });
    } catch (err) {
      return next(err);
    }
  },
);

// PATCH /api/v1/vendors/orders/:id/acknowledge
router.patch(
  "/orders/:id/acknowledge",
  authenticate,
  authorize("vendors", "update"),
  async (req, res, next) => {
    try {
      const updated = await prisma.vendorOrder.update({
        where: { id: req.params.id! },
        data: { status: "acknowledged" },
      });
      return res.json({ success: true, data: updated });
    } catch (err) {
      return next(err);
    }
  },
);

// PATCH /api/v1/vendors/orders/:id/deliver
router.patch(
  "/orders/:id/deliver",
  authenticate,
  authorize("vendors", "update"),
  async (req, res, next) => {
    try {
      const parsed = DeliverSchema.safeParse(req.body);
      if (!parsed.success)
        throw new ValidationError(parsed.error.flatten().fieldErrors);
      const result = await VendorService.confirmDelivery(
        req.params.id!,
        parsed.data.deliveryProofUrl,
      );
      return res
        .status(202)
        .json({
          success: true,
          data: result.settlement,
          meta: { approvalId: result.approvalId },
        });
    } catch (err) {
      return next(err);
    }
  },
);

export { router as vendorsRouter };
