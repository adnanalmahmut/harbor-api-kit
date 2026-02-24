import { createStrictZodDto } from '#src/core/index.js';
import { UpdateRoleSchema } from '#src/modules/rbac/application/use-cases/update-role.use-case.js';

export class UpdateRoleDto extends createStrictZodDto(UpdateRoleSchema) {}
