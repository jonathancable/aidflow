// apps/api/src/lib/with-audit.ts
import {
  AuditService,
  type AuditContext,
  type AuditAction,
} from "@services/audit.service";

interface AuditOptions {
  action: AuditAction;
  entityType: string;
  // Derive entityId from method result or params
  getEntityId: (result: unknown, params: unknown[]) => string;
  // Capture before-state (optional — called before the method)
  getBefore?: (params: unknown[]) => Promise<Record<string, unknown> | null>;
  // Capture after-state (optional — called after the method)
  getAfter?: (
    result: unknown,
    params: unknown[],
  ) => Promise<Record<string, unknown> | null>;
}

// Wraps an async service method with automatic audit logging.
// The wrapped method must receive context as its LAST parameter.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withAudit<TParams extends any[], TResult>(
  fn: (...args: [...TParams, AuditContext]) => Promise<TResult>,
  options: AuditOptions,
) {
  return async (...args: [...TParams, AuditContext]): Promise<TResult> => {
    const context = args[args.length - 1] as AuditContext;
    const params = args.slice(0, -1) as unknown as TParams;

    const beforeSnapshot = options.getBefore
      ? await options.getBefore(params).catch(() => null)
      : null;

    const result = await fn(...args);

    const entityId = options.getEntityId(result, params);
    const afterSnapshot = options.getAfter
      ? await options.getAfter(result, params).catch(() => null)
      : null;

    // Fire-and-forget — audit write never blocks the service response
    AuditService.log({
      context,
      action: options.action,
      entityType: options.entityType,
      entityId,
      beforeSnapshot,
      afterSnapshot,
    }).catch(() => {}); // already logged inside AuditService.log

    return result;
  };
}
