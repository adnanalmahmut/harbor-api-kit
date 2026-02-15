import { PermissionKeyVO } from '#src/modules/rbac/domain/value-objects/permission-key.vo.js';

export class UserPermissionOverride {
  constructor(
    readonly key: PermissionKeyVO,
    readonly effect: 'ALLOW' | 'DENY',
    readonly note?: string,
  ) {}
}
