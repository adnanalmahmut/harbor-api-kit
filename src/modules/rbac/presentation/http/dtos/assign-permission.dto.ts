import { createStrictZodDto } from '#src/infrastructure/validation/strict-zod-dto.js';
import { AssignPermissionToRoleSchema } from '#src/modules/rbac/application/use-cases/assign-permission-to-role.use-case.js';

export class AssignPermissionDto extends createStrictZodDto(
  AssignPermissionToRoleSchema.pick({ permissionId: true }),
) {}
