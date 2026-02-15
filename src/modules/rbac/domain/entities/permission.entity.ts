import { PermissionKeyVO } from '#src/modules/rbac/domain/value-objects/permission-key.vo.js';

export class Permission {
  constructor(
    readonly id: string,
    readonly action: string,
    readonly subject: string,
    readonly index: number,
    readonly description: string | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  get key(): PermissionKeyVO {
    return PermissionKeyVO.fromParts(this.subject, this.action);
  }
}
