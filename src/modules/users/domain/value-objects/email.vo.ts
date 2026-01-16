import { AppException } from '#src/core/exceptions/app-exception.js';

export class EmailVO {
  private constructor(readonly value: string) {}

  static create(email: string): EmailVO {
    const v = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      throw AppException.validationError({ field: 'email' });
    }
    return new EmailVO(v);
  }
}
