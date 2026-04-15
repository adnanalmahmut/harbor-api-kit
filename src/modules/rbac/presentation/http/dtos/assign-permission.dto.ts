import { createStrictZodDto } from '#src/core/index.js';
import { AssignPermissionToRoleSchema } from '../../../application/use-cases/assign-permission-to-role.use-case.js';

export class AssignPermissionDto extends createStrictZodDto(
  AssignPermissionToRoleSchema.pick({ permissionId: true }),
) {}
