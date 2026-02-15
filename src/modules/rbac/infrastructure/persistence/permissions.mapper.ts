import type { Prisma } from '#src/generated/prisma/client.js';
import { Permission } from '#src/modules/rbac/domain/entities/permission.entity.js';

export const permissionSelect = {
  id: true,
  action: true,
  subject: true,
  index: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PermissionSelect;

export function mapPrismaPermissionToEntity(r: {
  id: string;
  action: string;
  subject: string;
  index: number;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return new Permission(
    r.id,
    r.action,
    r.subject,
    r.index,
    r.description,
    r.createdAt,
    r.updatedAt,
  );
}
