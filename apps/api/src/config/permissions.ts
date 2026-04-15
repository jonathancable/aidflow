// apps/api/src/config/permissions.ts
import type { UserRole } from "@/generated/prisma";

type Action =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "release"
  | "export";

type PermissionMap = Partial<
  Record<UserRole, Partial<Record<string, Action[]>>>
>;

export const PERMISSIONS: PermissionMap = {
  system_admin: {
    users: ["read", "create", "update", "delete"],
    organizations: ["read", "create", "update", "delete"],
    programs: ["read", "create", "update", "delete"],
    contributions: ["read"],
    wallets: ["read"],
    allocations: ["read", "create", "approve"],
    distribution: ["read", "create", "approve", "release"],
    beneficiaries: ["read", "create", "update", "delete"],
    vendors: ["read", "create", "update"],
    reports: ["read", "export"],
    audit: ["read", "export"],
    settings: ["read", "update"],
  },

  system_controller: {
    users: ["read"],
    organizations: ["read"],
    programs: ["read"],
    contributions: ["read"],
    wallets: ["read"],
    allocations: ["read", "approve"],
    distribution: ["read", "approve", "release"],
    beneficiaries: ["read"],
    vendors: ["read", "approve"],
    reports: ["read", "export"],
    audit: ["read", "export"],
    settings: ["read"],
  },

  donor: {
    users: ["read"], // own profile only — row-level enforced in handler
    programs: ["read"],
    contributions: ["read", "create"],
    wallets: ["read"], // own wallet only — enforced in DAL
    allocations: ["read"], // own allocations only
    reports: ["read"], // own impact reports only
  },

  government_org: {
    users: ["read"], // own profile only
    programs: ["read", "create"],
    contributions: ["read", "create"],
    beneficiaries: ["read"],
    reports: ["read", "export"],
  },

  ngo: {
    users: ["read"], // own profile only
    programs: ["read"],
    distribution: ["read", "create", "update"],
    beneficiaries: ["read", "create", "update"],
    vendors: ["read", "create"],
    reports: ["read"],
  },

  vendor: {
    users: ["read"], // own profile only
    vendors: ["read", "update"], // own orders only
    reports: ["read"],
  },

  supportive_group: {
    users: ["read"], // own profile only
    programs: ["read"],
    beneficiaries: ["read"],
    reports: ["read"],
  },

  beneficiary: {
    users: ["read"], // own profile only
    beneficiaries: ["read"], // own profile only
  },
};

// Helper: check if a role has a specific permission
export function hasPermission(
  role: UserRole,
  resource: string,
  action: Action,
): boolean {
  return PERMISSIONS[role]?.[resource]?.includes(action) ?? false;
}
