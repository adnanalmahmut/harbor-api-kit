import type { Permission, Role } from '#src/generated/prisma/client.js';
import { User } from '#src/modules/users/domain/entities/user.entity.js';

export type PrismaUserRecord = {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  emailVerified: boolean;
  image: string;
  locale: string;
  roles: Role[];
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
};

export function mapPrismaUserToEntity(row: PrismaUserRecord): User {
  return new User(
    row.id,
    row.name,
    row.firstName,
    row.lastName,
    row.email,
    row.emailVerified,
    row.image,
    row.locale,
    row.roles.map((r) => r.slug),
    row.permissions.map((p) => `${p.subject}:${p.action}`),
    row.createdAt,
    row.updatedAt,
  );
}
