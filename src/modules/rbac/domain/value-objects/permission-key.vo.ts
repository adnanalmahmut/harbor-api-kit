import { AppException } from '#src/core/exceptions/app-exception.js';

export class PermissionKeyVO {
  private constructor(
    readonly action: string,
    readonly subject: string,
  ) {}

  static fromParts(action: string, subject: string) {
    const a = action.trim();
    const s = subject.trim();
    if (!a || !s)
      throw AppException.validationError({ field: 'permissionKey' });
    return new PermissionKeyVO(a, s);
  }

  static parse(key: string) {
    const [subject, action] = key.split(':');
    if (!action || !subject)
      throw AppException.validationError({ field: 'permissionKeyFormat' });
    return PermissionKeyVO.fromParts(action, subject);
  }

  toString() {
    return `${this.subject}:${this.action}`;
  }
}
