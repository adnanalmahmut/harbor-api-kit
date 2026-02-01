import { createStrictZodDto } from '#src/core/validation/strict-zod-dto.js';
import { UpdatePermissionSchema } from '#src/modules/rbac/application/use-cases/update-permission.use-case.js';

export class UpdatePermissionDto extends createStrictZodDto(
  UpdatePermissionSchema,
) {}
