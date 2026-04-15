-- DropForeignKey
ALTER TABLE "approval_requests" DROP CONSTRAINT "approval_allocation_fk";

-- DropForeignKey
ALTER TABLE "approval_requests" DROP CONSTRAINT "approval_batch_fk";

-- DropForeignKey
ALTER TABLE "approval_requests" DROP CONSTRAINT "approval_settlement_fk";
