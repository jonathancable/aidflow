// apps/api/src/config/approval-rules.ts
import type { UserRole } from "@/generated/prisma";

export interface ApprovalRule {
  assignedToRole: UserRole;
  onApprove: string; // descriptive label for logging
  onReject: string;
}

export const APPROVAL_RULES: Record<string, ApprovalRule> = {
  allocation: {
    assignedToRole: "system_controller",
    onApprove: "funds_reserved",
    onReject: "allocation_cancelled",
  },
  batch_release: {
    assignedToRole: "system_controller",
    onApprove: "batch_funds_released",
    onReject: "batch_cancelled",
  },
  vendor_settlement: {
    assignedToRole: "system_controller",
    onApprove: "vendor_paid",
    onReject: "settlement_cancelled",
  },
  user_activation: {
    assignedToRole: "system_admin",
    onApprove: "account_activated",
    onReject: "account_rejected",
  },
};

export function getApprovalRule(entityType: string): ApprovalRule {
  const rule = APPROVAL_RULES[entityType];
  if (!rule)
    throw new Error(`No approval rule defined for entity type: ${entityType}`);
  return rule;
}
