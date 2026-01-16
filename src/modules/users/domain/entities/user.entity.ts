export class UserEntity {
  constructor(
    readonly id: string,
    readonly email: string,
    readonly passwordHash: string,
    readonly firstName: string,
    readonly lastName: string,
    readonly locale: string,
    readonly emailVerifiedAt: Date | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}
}
