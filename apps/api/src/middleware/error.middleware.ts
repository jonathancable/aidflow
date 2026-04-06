import type { Request, Response, NextFunction } from 'express';

// Base error class
export class AppError extends Error {
  constructor(
    public readonly code:       string,
    public readonly message:    string,
    public readonly statusCode: number,
    public readonly details?:   unknown,
  ) { super(message); this.name = this.constructor.name; }
}

// Specific error classes
export class ValidationError   extends AppError {
  constructor(details: unknown) {
    super('VALIDATION_ERROR', 'Invalid request data', 422, details);
  }
}
export class AuthenticationError extends AppError {
  constructor() { super('UNAUTHORIZED', 'Authentication required', 401); }
}
export class AuthorizationError extends AppError {
  constructor() { super('FORBIDDEN', 'Insufficient permissions', 403); }
}
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}
export class InsufficientFundsError extends AppError {
  constructor() { super('INSUFFICIENT_FUNDS', 'Insufficient wallet balance', 409); }
}
export class StateTransitionError extends AppError {
  constructor(from: string, to: string) {
    super('INVALID_STATE_TRANSITION',
      `Cannot transition from ${from} to ${to}`, 409);
  }
}
export class ApprovalRequiredError extends AppError {
  constructor() { super('APPROVAL_REQUIRED', 'Action submitted for approval', 202); }
}

// Global handler — registered last in Express
export const errorHandler = (
  err: Error, _req: Request, res: Response, _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details ?? null },
    });
  }
  // Unknown errors: log full error, return generic message
  console.error('Unhandled error:', err);
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', details: null },
  });
};