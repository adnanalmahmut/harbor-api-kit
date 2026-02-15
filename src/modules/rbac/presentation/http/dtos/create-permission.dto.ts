import { createStrictZodDto } from '#src/core/presentation/http/validation/strict-zod-dto.js';
import { CreatePermissionSchema } from '#src/modules/rbac/application/use-cases/create-permission.use-case.js';

export class CreatePermissionDto extends createStrictZodDto(
  CreatePermissionSchema,
) {}
