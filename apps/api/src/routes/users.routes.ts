// apps/api/src/routes/users.routes.ts
import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { findUserById, findAllUsers, updateUserStatus } from "@/dal/index";
import type { UserRole } from "../generated/prisma";
import { authenticate } from "@middleware/authenticate.middleware";
import { authorize } from "@middleware/authorize.middleware";
import { AuditService } from "@services/audit.service";
import { NotFoundError } from "@/middleware/errors";

const router = Router();

// PATCH /api/v1/users/:id/activate  (Admin, SystemController)
router.patch(
  "/:id/activate",
  authenticate,
  authorize("users", "update"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const targetUserId = req.params.id!;

      const existing = await findUserById(targetUserId);
      if (!existing) throw new NotFoundError("User");

      const updated = await updateUserStatus(targetUserId, "active");

      // Fire-and-forget audit — account activation
      AuditService.log({
        context: {
          actorId: req.context!.userId,
          actorRole: req.context!.role,
          ...(req.ip !== undefined ? { ipAddress: req.ip } : {}),
        },
        action: "ACTIVATION",
        entityType: "user",
        entityId: targetUserId,
        beforeSnapshot: { status: existing.status },
        afterSnapshot: { status: updated.status },
      }).catch(() => {});

      res.json({ success: true, data: { user: updated } });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/users  (Admin, SystemController)
router.get(
  "/",
  authenticate,
  authorize("users", "read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, status, role } = req.query;
      const result = await findAllUsers({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 50,
        ...(status ? { status: status as string } : {}),
        ...(role ? { role: role as UserRole } : {}),
      });
      res.json({
        success: true,
        data: result.users,
        meta: { total: result.total, page: result.page, limit: result.limit },
      });
    } catch (err) {
      next(err);
    }
  },
);

export { router as usersRouter };
