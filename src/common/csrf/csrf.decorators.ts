import { SetMetadata } from '@nestjs/common';

export const CSRF_EXEMPT_KEY = 'security:csrf-exempt';

export const CsrfExempt = () => SetMetadata(CSRF_EXEMPT_KEY, true);
