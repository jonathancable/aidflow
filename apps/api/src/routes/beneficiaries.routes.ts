// apps/api/src/routes/beneficiaries.routes.ts
import { Router } from "express";
import {
  createBeneficiary,
  findBeneficiaryById,
  findBeneficiariesByOrg,
  findBeneficiaryEntitlements,
} from "@dal/beneficiary.dal";
import { authenticate } from "@middleware/authenticate.middleware";
import { authorize } from "@middleware/authorize.middleware";
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
} from "@middleware/errors";
import { z } from "zod";

const router = Router();

const CreateBeneficiarySchema = z.object({
  fullName: z.string().min(2).max(200),
  idNumber: z.string().max(50).optional(),
  contact: z.string().max(100).optional(),
  profileData: z.record(z.unknown()).optional(),
});

// GET /api/v1/beneficiaries
router.get(
  "/",
  authenticate,
  authorize("beneficiaries", "read"),
  async (req, res, next) => {
    try {
      const orgId = req.context.orgId;
      if (!orgId) throw new AuthorizationError("No organisation context");
      const result = await findBeneficiariesByOrg(orgId, {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
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

// GET /api/v1/beneficiaries/:id
router.get(
  "/:id",
  authenticate,
  authorize("beneficiaries", "read"),
  async (req, res, next) => {
    try {
      const b = await findBeneficiaryById(req.params.id!);
      if (!b) throw new NotFoundError("Beneficiary");
      // NGOs can only access beneficiaries in their own org
      if (req.context.role === "ngo" && b.orgId !== req.context.orgId) {
        throw new AuthorizationError("Access denied");
      }
      return res.json({ success: true, data: b });
    } catch (err) {
      return next(err);
    }
  },
);

// GET /api/v1/beneficiaries/:id/entitlements
router.get(
  "/:id/entitlements",
  authenticate,
  authorize("beneficiaries", "read"),
  async (req, res, next) => {
    try {
      const entitlements = await findBeneficiaryEntitlements(req.params.id!);
      return res.json({ success: true, data: entitlements });
    } catch (err) {
      return next(err);
    }
  },
);

// POST /api/v1/beneficiaries
router.post(
  "/",
  authenticate,
  authorize("beneficiaries", "create"),
  async (req, res, next) => {
    try {
      const parsed = CreateBeneficiarySchema.safeParse(req.body);
      if (!parsed.success)
        throw new ValidationError(parsed.error.flatten().fieldErrors);
      if (!req.context.orgId)
        throw new AuthorizationError("No organisation context");
      const b = await createBeneficiary({
        orgId: req.context.orgId,
        fullName: parsed.data.fullName,
        ...(parsed.data.idNumber !== undefined ? { idNumber: parsed.data.idNumber } : {}),
        ...(parsed.data.contact !== undefined ? { contact: parsed.data.contact } : {}),
        ...(parsed.data.profileData !== undefined ? { profileData: parsed.data.profileData } : {}),
      });
      return res.status(201).json({ success: true, data: b });
    } catch (err) {
      return next(err);
    }
  },
);

export { router as beneficiariesRouter };
