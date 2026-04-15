// apps/api/src/services/jwt.service.ts
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { env } from "@config/env";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma";
import { AuthenticationError } from "@middleware/errors";

interface AccessTokenPayload {
  sub: string; // user ID
  role: UserRole;
  orgId: string | null;
  type: "access";
}

export const JwtService = {
  // Sign a short-lived access token (15 min)
  signAccessToken(
    userId: string,
    role: UserRole,
    orgId: string | null,
  ): string {
    const payload: AccessTokenPayload = {
      sub: userId,
      role,
      orgId,
      type: "access",
    };
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES,
      issuer: "aidflow-api",
      audience: "aidflow-client",
    } as jwt.SignOptions);
  },

  // Verify and decode an access token
  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      return jwt.verify(token, env.JWT_ACCESS_SECRET, {
        issuer: "aidflow-api",
        audience: "aidflow-client",
      }) as AccessTokenPayload;
    } catch {
      throw new AuthenticationError("Invalid or expired access token");
    }
  },

  // Issue access + refresh token pair; persist hashed refresh token
  async issueTokenPair(userId: string, role: UserRole, orgId: string | null) {
    const accessToken = JwtService.signAccessToken(userId, role, orgId);
    const refreshToken = crypto.randomBytes(64).toString("hex");
    const tokenHash = await bcrypt.hash(refreshToken, 10);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return { accessToken, refreshToken };
  },

  // Validate raw token against stored hash, issue new pair (rotation)
  async rotateRefreshToken(rawToken: string) {
    // Find candidates by userId is not possible without the token hash
    // So we must verify the hash against recent tokens for this user
    const recent = await prisma.refreshToken.findMany({
      where: { expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 20, // limit the comparison set
    });

    let matched: (typeof recent)[0] | null = null;
    for (const record of recent) {
      const isMatch = await bcrypt.compare(rawToken, record.tokenHash);
      if (isMatch) {
        matched = record;
        break;
      }
    }

    if (!matched)
      throw new AuthenticationError("Invalid or expired refresh token");

    // Delete the used token (rotation — each token used exactly once)
    await prisma.refreshToken.delete({ where: { id: matched.id } });

    // Fetch current user state to embed fresh role in new access token
    const user = await prisma.user.findUnique({
      where: { id: matched.userId },
      select: { id: true, role: true, orgId: true, status: true },
    });
    if (!user || user.status !== "active") {
      throw new AuthenticationError("Account is no longer active");
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await JwtService.issueTokenPair(user.id, user.role, user.orgId);

    return { accessToken, newRefreshToken };
  },

  // Revoke a specific refresh token on logout
  async revokeRefreshToken(rawToken: string) {
    const recent = await prisma.refreshToken.findMany({
      where: { expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    for (const record of recent) {
      const isMatch = await bcrypt.compare(rawToken, record.tokenHash);
      if (isMatch) {
        await prisma.refreshToken.delete({ where: { id: record.id } });
        return;
      }
    }
  },

  // Cleanup job — call from a nightly scheduled job
  async purgeExpiredTokens() {
    await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  },
};
