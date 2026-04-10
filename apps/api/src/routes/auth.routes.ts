// apps/api/src/routes/auth.routes.ts
import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import bcrypt from "bcryptjs";
import { RegisterSchema, LoginSchema } from "@aidflow/shared";
import {
  createUser,
  findUserByEmailWithPassword,
  findUserById,
  updateLastLogin,
} from "@/dal/index";
import { createWallet } from "@/dal/index";
import { JwtService } from "@/services/jwt.service";
import {
  ConflictError,
  AuthenticationError,
  AccountPendingError,
  AccountSuspendedError,
  ValidationError,
} from "@/middleware/errors";
import { authenticate } from "@middleware/authenticate.middleware";
import { authorize } from "@middleware/authorize.middleware";
import { env } from "@/config/env";

const router = Router();

// POST /api/v1/auth/register
router.post(
  "/register",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = RegisterSchema.safeParse(req.body);
      if (!parsed.success)
        throw new ValidationError(parsed.error.flatten().fieldErrors);

      const { email, password, fullName, role, orgId } = parsed.data;

      const existing = await findUserByEmailWithPassword(email);
      if (existing)
        throw new ConflictError("An account with this email already exists");

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await createUser({
        email,
        passwordHash,
        fullName,
        role,
        ...(orgId ? { orgId } : {}),
      });

      if (role === "donor") {
        await createWallet({ ownerType: "donor", ownerId: user.id });
      }

      res.status(201).json({
        success: true,
        data: {
          user,
          message: "Account created. Awaiting activation by an administrator.",
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/auth/login
router.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = LoginSchema.safeParse(req.body);
      if (!parsed.success)
        throw new ValidationError(parsed.error.flatten().fieldErrors);

      const { email, password } = parsed.data;

      const user = await findUserByEmailWithPassword(email);
      if (!user) throw new AuthenticationError("Invalid email or password");

      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch)
        throw new AuthenticationError("Invalid email or password");

      // Status gate — checked after password to prevent user enumeration
      if (user.status === "pending") throw new AccountPendingError();
      if (user.status === "suspended") throw new AccountSuspendedError();

      const { accessToken, refreshToken } = await JwtService.issueTokenPair(
        user.id,
        user.role,
        user.orgId,
      );

      await updateLastLogin(user.id);

      // Refresh token in httpOnly cookie — never accessible to JavaScript
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
        path: "/api/v1/auth", // scoped to auth routes only
      });

      res.json({
        success: true,
        data: {
          accessToken,
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            orgId: user.orgId,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/auth/refresh
router.post(
  "/refresh",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.refreshToken as string | undefined;
      if (!token) throw new AuthenticationError("No refresh token provided");

      const { accessToken, newRefreshToken } =
        await JwtService.rotateRefreshToken(token);

      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/api/v1/auth",
      });

      res.json({ success: true, data: { accessToken } });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/v1/auth/logout
router.post(
  "/logout",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.refreshToken as string | undefined;
      if (token) await JwtService.revokeRefreshToken(token);

      res.clearCookie("refreshToken", { path: "/api/v1/auth" });
      res.json({ success: true, data: { message: "Logged out successfully" } });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/auth/me — protected; all roles have users:read for own profile
router.get(
  "/me",
  authenticate,
  authorize("users", "read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await findUserById(req.context!.userId);
      if (!user) throw new AuthenticationError("User no longer exists");
      res.json({ success: true, data: { user } });
    } catch (err) {
      next(err);
    }
  },
);

export { router as authRouter };
