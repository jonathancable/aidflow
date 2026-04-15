// apps/api/src/middleware/errors.ts

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── Auth errors ─────────────────────────────────────────────────
export class AuthenticationError extends AppError {
  constructor(message = "Authentication required") {
    super("UNAUTHORIZED", message, 401);
  }
}
export class AuthorizationError extends AppError {
  constructor(message = "Insufficient permissions") {
    super("FORBIDDEN", message, 403);
  }
}
export class AccountPendingError extends AppError {
  constructor() {
    super("ACCOUNT_PENDING", "Account awaiting activation", 403);
  }
}
export class AccountSuspendedError extends AppError {
  constructor() {
    super("ACCOUNT_SUSPENDED", "Account has been suspended", 403);
  }
}

// ── Data errors ─────────────────────────────────────────────────
export class ValidationError extends AppError {
  constructor(details: unknown) {
    super("VALIDATION_ERROR", "Invalid request data", 422, details);
  }
}
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super("NOT_FOUND", `${resource} not found`, 404);
  }
}
export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", message, 409);
  }
}

// ── Financial errors ────────────────────────────────────────────
export class InsufficientFundsError extends AppError {
  constructor() {
    super("INSUFFICIENT_FUNDS", "Insufficient wallet balance", 409);
  }
}
export class StateTransitionError extends AppError {
  constructor(from: string, to: string) {
    super(
      "INVALID_STATE_TRANSITION",
      `Cannot transition from ${from} to ${to}`,
      409,
    );
  }
}
export class ApprovalRequiredError extends AppError {
  constructor(approvalId: string) {
    super("APPROVAL_REQUIRED", "Action submitted for approval", 202, {
      approvalId,
    });
  }
}
export class LedgerIntegrityError extends AppError {
  constructor(message: string) {
    super("LEDGER_INTEGRITY_ERROR", message, 500);
  }
}
