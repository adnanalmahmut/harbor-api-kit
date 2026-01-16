export class RoleEntity {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly slug: string,
    readonly description: string | null,
    readonly isSystem: boolean,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}
}
