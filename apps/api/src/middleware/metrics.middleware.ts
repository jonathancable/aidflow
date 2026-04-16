// apps/api/src/middleware/metrics.middleware.ts
import { Registry, Counter, Histogram, Gauge } from "prom-client";
import type { Request, Response, NextFunction } from "express";

export const registry = new Registry();

// HTTP request metrics
export const httpRequestCounter = new Counter({
  name: "aidflow_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [registry],
});

export const httpRequestDuration = new Histogram({
  name: "aidflow_http_request_duration_ms",
  help: "HTTP request duration in milliseconds",
  labelNames: ["method", "route"],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
  registers: [registry],
});

// Business metrics
export const ledgerTransferCounter = new Counter({
  name: "aidflow_ledger_transfers_total",
  help: "Total ledger transfers processed",
  labelNames: ["reference_type", "status"],
  registers: [registry],
});

export const pendingApprovalsGauge = new Gauge({
  name: "aidflow_pending_approvals",
  help: "Current number of pending approval requests",
  registers: [registry],
});

// Middleware to collect request metrics
export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const end = httpRequestDuration.startTimer({
    method: req.method,
    route: req.path,
  });
  res.on("finish", () => {
    end();
    httpRequestCounter.inc({
      method: req.method,
      route: req.path,
      status_code: res.statusCode,
    });
  });
  next();
};

// GET /metrics — Prometheus scrape endpoint (restrict to internal only in production)
export const metricsRoute = async (_req: Request, res: Response) => {
  res.set("Content-Type", registry.contentType);
  res.end(await registry.metrics());
};
