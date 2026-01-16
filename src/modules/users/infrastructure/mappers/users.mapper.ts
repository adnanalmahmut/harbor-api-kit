import { UserEntity } from '#src/modules/users/domain/entities/user.entity.js';

export type PrismaUserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  locale: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function mapPrismaUserToEntity(row: PrismaUserRecord): UserEntity {
  return new UserEntity(
    row.id,
    row.email,
    row.passwordHash,
    row.firstName,
    row.lastName,
    row.locale,
    row.emailVerifiedAt,
    row.createdAt,
    row.updatedAt,
  );
}
