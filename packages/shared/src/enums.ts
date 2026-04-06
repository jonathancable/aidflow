import { z } from 'zod';

export const UserRole = z.enum([
  'system_admin', 'system_controller', 'donor',
  'government_org', 'ngo', 'vendor',
  'supportive_group', 'beneficiary',
]);

export const WalletOwnerType = z.enum([
  'system_treasury', 'donor', 'program',
  'ngo', 'vendor', 'beneficiary',
]);

export const ContributionStatus = z.enum([
  'pending', 'confirmed', 'allocated', 'refunded',
]);

export const AllocationStatus = z.enum([
  'draft', 'pending_approval', 'approved',
  'released', 'rejected', 'reversed',
]);

export const BatchStatus = z.enum([
  'draft', 'submitted', 'approved', 'released',
  'in_delivery', 'completed', 'partially_completed', 'cancelled',
]);

export const BatchItemStatus = z.enum([
  'pending', 'confirmed', 'failed', 'reversed',
]);

export const SettlementStatus = z.enum([
  'pending', 'approved', 'processing', 'settled', 'failed',
]);

export const VendorOrderStatus = z.enum([
  'issued', 'acknowledged', 'in_delivery', 'delivered', 'disputed',
]);

export const ProgramStatus = z.enum([
  'draft', 'active', 'paused', 'completed', 'cancelled',
]);

// TypeScript types inferred from Zod enums
export type UserRole          = z.infer<typeof UserRole>;
export type WalletOwnerType   = z.infer<typeof WalletOwnerType>;
export type ContributionStatus= z.infer<typeof ContributionStatus>;
export type AllocationStatus  = z.infer<typeof AllocationStatus>;
export type BatchStatus       = z.infer<typeof BatchStatus>;
export type BatchItemStatus   = z.infer<typeof BatchItemStatus>;
export type SettlementStatus  = z.infer<typeof SettlementStatus>;
export type VendorOrderStatus = z.infer<typeof VendorOrderStatus>;
export type ProgramStatus     = z.infer<typeof ProgramStatus>;