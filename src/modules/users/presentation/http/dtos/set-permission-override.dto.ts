import { createStrictZodDto } from '#src/core/index.js';
import { SetUserPermissionOverrideSchema } from '../../../application/use-cases/set-user-permission-override.use-case.js';

export class SetPermissionOverrideDto extends createStrictZodDto(
  SetUserPermissionOverrideSchema,
) {}
