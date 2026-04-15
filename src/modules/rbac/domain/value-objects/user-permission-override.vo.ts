import { PermissionKeyVO } from './permission-key.vo.js';

export class UserPermissionOverride {
  constructor(
    readonly key: PermissionKeyVO,
    readonly effect: 'ALLOW' | 'DENY',
    readonly note?: string,
  ) {}
}
