import { createStrictZodDto } from '#src/core/validation/strict-zod-dto.js';
import { SetUserPermissionOverrideSchema } from '#src/modules/users/application/use-cases/set-user-permission-override.use-case.js';

export class SetPermissionOverrideDto extends createStrictZodDto(
  SetUserPermissionOverrideSchema,
) {}
