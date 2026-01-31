import { createStrictZodDto } from '#src/infrastructure/validation/strict-zod-dto.js';
import { z } from 'zod';

export const ReplaceRolePermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid()),
});

export class ReplaceRolePermissionsDto extends createStrictZodDto(
  ReplaceRolePermissionsSchema,
) {}
