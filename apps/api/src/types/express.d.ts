// apps/api/src/types/express.d.ts
import type { UserRole } from "@/generated/prisma";

declare global {
  namespace Express {
    interface Request {
      context: {
        userId: string;
        role: UserRole;
        orgId: string | null;
      };
    }
  }
}

export {};
