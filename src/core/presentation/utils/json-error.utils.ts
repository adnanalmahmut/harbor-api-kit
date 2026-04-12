function normalizeMessage(msg: unknown): string {
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.map(normalizeMessage).join(' ');
  if (msg && typeof msg === 'object' && 'message' in (msg as any)) {
    return normalizeMessage((msg as any).message);
  }
  return '';
}

export function isMalformedJsonError(exception: unknown): boolean {
  if (exception instanceof SyntaxError && 'body' in (exception as any)) {
    return true;
  }

  if (
    exception &&
    typeof exception === 'object' &&
    'getResponse' in exception &&
    typeof (exception as any).getResponse === 'function'
  ) {
    const response = (exception as any).getResponse();
    const message = (exception as any).message;

    const combined =
      `${normalizeMessage(response)} ${message ?? ''}`.toLowerCase();

    const jsonErrorPatterns = [
      'body is not valid json',
      'invalid json',
      'unexpected token',
      'json parse',
      'malformed json',
    ];

    return jsonErrorPatterns.some((pattern) => combined.includes(pattern));
  }

  return false;
}
