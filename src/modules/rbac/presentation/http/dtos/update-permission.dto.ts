import { createStrictZodDto } from '#src/core/index.js';
import { UpdatePermissionSchema } from '../../../application/use-cases/update-permission.use-case.js';

export class UpdatePermissionDto extends createStrictZodDto(
  UpdatePermissionSchema,
) {}
