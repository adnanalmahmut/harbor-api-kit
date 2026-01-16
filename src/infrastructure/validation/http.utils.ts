export function stripQuery(url: string | undefined): string {
  const u = url ?? '/';
  const i = u.indexOf('?');
  return i === -1 ? u : u.slice(0, i);
}

export function extractClientIp(xff?: string | string[]): string | undefined {
  if (!xff) return undefined;
  const val = Array.isArray(xff) ? xff[0] : xff;
  return val.split(',')[0]?.trim() || undefined;
}
