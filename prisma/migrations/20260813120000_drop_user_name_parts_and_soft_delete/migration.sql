-- The public user contract is Better Auth's single `name` field: drop the
-- derived first/last name columns.
ALTER TABLE "user" DROP COLUMN "firstName";
ALTER TABLE "user" DROP COLUMN "lastName";

-- Soft delete is no longer applied to the Better Auth tables: user, session and
-- account deletions are handled by Better Auth's own (hard) delete flows.
ALTER TABLE "user" DROP COLUMN "deletedAt";
ALTER TABLE "session" DROP COLUMN "deletedAt";
ALTER TABLE "account" DROP COLUMN "deletedAt";
