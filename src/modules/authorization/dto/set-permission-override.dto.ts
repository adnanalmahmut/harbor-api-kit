import { createStrictZodDto } from '#src/common/validation/strict-zod-dto.js';
import { SetUserPermissionOverrideSchema } from '../authorization.service.js';

export class SetPermissionOverrideDto extends createStrictZodDto(
  SetUserPermissionOverrideSchema,
) {}
