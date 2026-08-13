/**
 * Local-driver URL normalization must produce routes that actually exist.
 *
 * `LocalDriver.getSignedUrl` returns a relative marker `/local/{storageKey}`;
 * these helpers rewrite it to the streaming endpoint. S3 drivers return
 * absolute presigned URLs, which must pass through untouched.
 */
import {
  isLocalDriverUrl,
  normalizeDownloadUrl,
  normalizePublicUrl,
} from './files.urls.js';

describe('URL normalization helpers', () => {
  const FILE_ID = '550e8400-e29b-41d4-a716-446655440000';
  const PUBLIC_TOKEN = 'aabbccdd-1122-3344-5566-778899001122';
  const STORAGE_KEY = 'files/2026/4/550e8400.jpg';

  describe('isLocalDriverUrl', () => {
    it('detects local driver marker', () => {
      expect(isLocalDriverUrl(`/local/${STORAGE_KEY}`)).toBe(true);
    });

    it('rejects absolute S3 presigned URL', () => {
      expect(
        isLocalDriverUrl(
          'https://bucket.s3.amazonaws.com/files/2026/4/x.jpg?X-Amz-Signature=abc',
        ),
      ).toBe(false);
    });

    it('rejects plain relative path without /local/ prefix', () => {
      expect(isLocalDriverUrl('/api/v1/files/some-id/download')).toBe(false);
    });
  });

  describe('normalizeDownloadUrl', () => {
    it('rewrites local driver URL to file stream endpoint with file id', () => {
      const localUrl = `/local/${STORAGE_KEY}`;
      const result = normalizeDownloadUrl(localUrl, FILE_ID);
      expect(result).toBe(`/api/v1/files/${FILE_ID}/stream`);
    });

    it('does NOT contain storage key in output', () => {
      const localUrl = `/local/${STORAGE_KEY}`;
      const result = normalizeDownloadUrl(localUrl, FILE_ID);
      expect(result).not.toContain(STORAGE_KEY);
      expect(result).not.toContain('/local/');
    });

    it('passes S3 presigned URL through unchanged', () => {
      const s3Url =
        'https://bucket.s3.amazonaws.com/files/2026/4/x.jpg?X-Amz-Signature=abc123';
      const result = normalizeDownloadUrl(s3Url, FILE_ID);
      expect(result).toBe(s3Url);
    });
  });

  describe('normalizePublicUrl', () => {
    it('rewrites local driver URL to public stream endpoint with token', () => {
      const localUrl = `/local/${STORAGE_KEY}`;
      const result = normalizePublicUrl(localUrl, PUBLIC_TOKEN);
      expect(result).toBe(`/api/v1/public/files/${PUBLIC_TOKEN}/stream`);
    });

    it('does NOT contain storage key in output', () => {
      const localUrl = `/local/${STORAGE_KEY}`;
      const result = normalizePublicUrl(localUrl, PUBLIC_TOKEN);
      expect(result).not.toContain(STORAGE_KEY);
      expect(result).not.toContain('/local/');
    });

    it('passes S3 presigned URL through unchanged', () => {
      const s3Url = 'https://bucket.s3.amazonaws.com/files/x.jpg?sig=abc';
      const result = normalizePublicUrl(s3Url, PUBLIC_TOKEN);
      expect(result).toBe(s3Url);
    });
  });

  describe('route matching', () => {
    it('download URL matches stream controller route pattern', () => {
      const url = normalizeDownloadUrl(`/local/${STORAGE_KEY}`, FILE_ID);
      // Controller route: @Get(':id/stream') under prefix /api/v1/files
      expect(url).toMatch(/^\/api\/v1\/files\/[0-9a-f-]+\/stream$/);
    });

    it('public URL matches public stream controller route pattern', () => {
      const url = normalizePublicUrl(`/local/${STORAGE_KEY}`, PUBLIC_TOKEN);
      // Controller route: @Get(':token/stream') under prefix /api/v1/public/files
      expect(url).toMatch(/^\/api\/v1\/public\/files\/[0-9a-f-]+\/stream$/);
    });

    it('download URL is NOT self-referential (not /download endpoint)', () => {
      const url = normalizeDownloadUrl(`/local/${STORAGE_KEY}`, FILE_ID);
      expect(url).not.toContain('/download');
    });

    it('public URL is NOT self-referential (different from metadata endpoint)', () => {
      const url = normalizePublicUrl(`/local/${STORAGE_KEY}`, PUBLIC_TOKEN);
      // The metadata endpoint is /api/v1/public/files/:token (no /stream)
      expect(url).toContain('/stream');
    });
  });
});
