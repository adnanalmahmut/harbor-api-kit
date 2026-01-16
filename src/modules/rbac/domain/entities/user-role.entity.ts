export class UserRoleEntity {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly roleId: string,
    readonly assignedBy: string | null,
    readonly createdAt: Date,
  ) {}
}
