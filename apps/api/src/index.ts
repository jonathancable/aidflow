import "./config/env"; // validates env on startup — must be first
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { requestLogger } from "./middleware/logger.middleware";
import { errorHandler } from "./middleware/error.middleware";
import { authRouter } from "./routes/auth.routes";
import { approvalsRouter } from "./routes/approvals.routes";
import { programsRouter } from "./routes/programs.routes";
import { contributionsRouter } from "./routes/contributions.routes";
import { walletsRouter } from "./routes/wallets.routes";
import { allocationsRouter } from "./routes/allocations.routes";
import { distributionRouter } from "./routes/distribution.routes";
import { beneficiariesRouter } from "./routes/beneficiaries.routes";
import { vendorsRouter } from "./routes/vendors.routes";
import { reportsRouter } from "./routes/reports.routes";
import { usersRouter } from "./routes/users.routes";
import { AllocationService } from "@services/allocation.service";
import { BatchService } from "@services/batch.service";
import { VendorService } from "@services/vendor.service";
import "./jobs/workers"; // starts BullMQ workers
import { reconciliationQueue } from "./jobs/queue";

// Register all approval resolvers — must run before any request is processed
AllocationService.registerApprovalResolver();
BatchService.registerApprovalResolver();
VendorService.registerApprovalResolver();

// Schedule nightly reconciliation at 02:00 UTC
reconciliationQueue.add(
  "nightly-reconciliation",
  { date: new Date().toISOString() },
  {
    repeat: { pattern: "0 2 * * *" }, // cron: 2am every day
    jobId: "nightly-reconciliation", // stable ID prevents duplicates on restart
  },
);

const app = express();

// Security headers — runs on every request
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGINS.split(","),
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestLogger);

// Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/approvals", approvalsRouter);
app.use("/api/v1/programs", programsRouter);
app.use("/api/v1/contributions", contributionsRouter);
app.use("/api/v1/wallets", walletsRouter);
app.use("/api/v1/allocations", allocationsRouter);
app.use("/api/v1/distribution", distributionRouter);
app.use("/api/v1/beneficiaries", beneficiariesRouter);
app.use("/api/v1/vendors", vendorsRouter);
app.use("/api/v1/reports", reportsRouter);
app.use("/api/v1/users", usersRouter);

// Health check — for load balancer / uptime monitoring
app.get("/health", (_req, res) => res.json({ status: "ok", ts: Date.now() }));

// Global error handler — must be last
app.use(errorHandler);

export { app };

// Skip listen when imported by tests — supertest manages its own server lifecycle
if (process.env.VITEST === undefined) {
  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`AidFlow API running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
}
