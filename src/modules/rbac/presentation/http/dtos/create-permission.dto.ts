import { createStrictZodDto } from '#src/core/index.js';
import { CreatePermissionSchema } from '../../../application/use-cases/create-permission.use-case.js';

export class CreatePermissionDto extends createStrictZodDto(
  CreatePermissionSchema,
) {}
