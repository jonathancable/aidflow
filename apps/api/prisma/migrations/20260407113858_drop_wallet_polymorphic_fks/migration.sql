-- Drop polymorphic FK constraints on wallets.ownerId
-- ownerType + ownerId integrity is enforced at the application layer
ALTER TABLE "wallets" DROP CONSTRAINT IF EXISTS "wallet_user_fk";
ALTER TABLE "wallets" DROP CONSTRAINT IF EXISTS "wallet_org_fk";
ALTER TABLE "wallets" DROP CONSTRAINT IF EXISTS "wallet_program_fk";