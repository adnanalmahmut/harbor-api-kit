import type { HttpException } from '@nestjs/common';

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
    const httpEx = exception as HttpException;
    const response = httpEx.getResponse();

    const combined =
      `${normalizeMessage(response)} ${(httpEx as any)?.message ?? ''}`.toLowerCase();

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
