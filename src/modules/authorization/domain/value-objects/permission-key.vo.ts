import { AuthorizationDomainException } from '../exceptions/authorization-domain.exception.js';

/**
 * Permission key format: subject:action (e.g., user:read, role:manage)
 * Lowercase letters, numbers, underscores, and hyphens are allowed.
 */
export const PERMISSION_KEY_PATTERN = /^[a-z0-9_-]+:[a-z0-9_-]+$/;

export class PermissionKeyVO {
  private constructor(
    readonly subject: string,
    readonly action: string,
  ) {}

  static fromParts(subject: string, action: string): PermissionKeyVO {
    const s = subject.trim().toLowerCase();
    const a = action.trim().toLowerCase();
    if (!s || !a || !PERMISSION_KEY_PATTERN.test(`${s}:${a}`)) {
      throw AuthorizationDomainException.invalidPermissionKey(`${s}:${a}`);
    }
    return new PermissionKeyVO(s, a);
  }

  static parse(key: string): PermissionKeyVO {
    if (!PermissionKeyVO.isValid(key)) {
      throw AuthorizationDomainException.invalidPermissionKey(key);
    }
    const [subject, action] = key.split(':');
    return new PermissionKeyVO(subject, action);
  }

  static isValid(key: string): boolean {
    return PERMISSION_KEY_PATTERN.test(key);
  }

  toString(): string {
    return `${this.subject}:${this.action}`;
  }
}
