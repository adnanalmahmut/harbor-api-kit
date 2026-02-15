import { createStrictZodDto } from '#src/core/presentation/http/validation/strict-zod-dto.js';
import { z } from 'zod';

export const ReplaceUserRolesSchema = z.object({
  roleIds: z.array(z.string().uuid()),
});

export class ReplaceUserRolesDto extends createStrictZodDto(
  ReplaceUserRolesSchema,
) {}
