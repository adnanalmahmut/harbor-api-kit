import { createStrictZodDto } from '#src/core/index.js';
import { UpdatePermissionSchema } from '#src/modules/rbac/application/use-cases/update-permission.use-case.js';

export class UpdatePermissionDto extends createStrictZodDto(
  UpdatePermissionSchema,
) {}
