/**
 * The local driver returns a relative marker (`/local/{storageKey}`) instead
 * of a signed URL. These helpers rewrite it to the endpoint that actually
 * serves bytes, and leave absolute S3 presigned URLs untouched.
 */

export function isLocalDriverUrl(url: string): boolean {
  return url.startsWith('/local/');
}

export function normalizeDownloadUrl(url: string, fileId: string): string {
  // Points at the stream endpoint, NOT the download-url endpoint — the latter
  // returns JSON metadata and would create a self-referential loop.
  return isLocalDriverUrl(url) ? `/api/v1/files/${fileId}/stream` : url;
}

export function normalizePublicUrl(url: string, publicToken: string): string {
  return isLocalDriverUrl(url)
    ? `/api/v1/public/files/${publicToken}/stream`
    : url;
}
