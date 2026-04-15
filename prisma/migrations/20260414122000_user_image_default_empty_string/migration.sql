UPDATE "user"
SET "image" = ''
WHERE "image" IS NULL;

ALTER TABLE "user"
ALTER COLUMN "image" SET DEFAULT '';

ALTER TABLE "user"
ALTER COLUMN "image" SET NOT NULL;
