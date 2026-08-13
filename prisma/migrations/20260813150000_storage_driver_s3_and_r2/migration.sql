-- Record which provider actually holds the bytes.
--
-- `StorageDriver` carried only S3_COMPAT and LOCAL, so every object stored on
-- AWS S3 or Cloudflare R2 was written as S3_COMPAT and the distinction was
-- lost. Adding the two values is additive: no existing row changes, and
-- S3_COMPAT keeps its meaning for generic S3-compatible endpoints such as
-- DigitalOcean Spaces.
ALTER TYPE "StorageDriver" ADD VALUE IF NOT EXISTS 'S3';
ALTER TYPE "StorageDriver" ADD VALUE IF NOT EXISTS 'R2';
