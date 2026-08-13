import { createStrictZodDto } from '#src/common/validation.pipe.js';
import { SetUserPermissionOverrideSchema } from '../authorization.service.js';

export class SetPermissionOverrideDto extends createStrictZodDto(
  SetUserPermissionOverrideSchema,
) {}
