// apps/api/src/routes/users.routes.ts
import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { findUserById, updateUserStatus } from "@/dal/index";
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
      // TODO: implement paginated user list in Sprint 6
      res.status(501).json({ message: "Not implemented" });
    } catch (err) {
      next(err);
    }
  },
);

export { router as usersRouter };
