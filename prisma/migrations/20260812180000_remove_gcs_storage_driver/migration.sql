DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "files" WHERE "driver" = 'GCS') THEN
    RAISE EXCEPTION
      'Cannot remove GCS storage driver while files still reference it';
  END IF;
END $$;

ALTER TYPE "StorageDriver" RENAME TO "StorageDriver_old";

CREATE TYPE "StorageDriver" AS ENUM ('S3_COMPAT', 'LOCAL');

ALTER TABLE "files"
  ALTER COLUMN "driver" TYPE "StorageDriver"
  USING ("driver"::text::"StorageDriver");

DROP TYPE "StorageDriver_old";
