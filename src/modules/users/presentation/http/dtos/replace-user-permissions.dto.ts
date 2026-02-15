import { createStrictZodDto } from '#src/core/presentation/http/validation/strict-zod-dto.js';
import { z } from 'zod';

export const ReplaceUserPermissionsSchema = z.object({
  overrides: z.array(
    z.object({
      permissionId: z.string().uuid(),
      effect: z.enum(['ALLOW', 'DENY']),
      note: z.string().optional(),
    }),
  ),
});

export class ReplaceUserPermissionsDto extends createStrictZodDto(
  ReplaceUserPermissionsSchema,
) {}
