import { createStrictZodDto } from '#src/common/validation/strict-zod-dto.js';
import { isPermissionKey } from '../permissions.catalog.js';
import { z } from 'zod';

export const ReplaceUserPermissionsSchema = z.object({
  overrides: z.array(
    z.object({
      permissionKey: z.string().refine(isPermissionKey),
      effect: z.enum(['ALLOW', 'DENY']),
      note: z.string().optional(),
    }),
  ),
});

export class ReplaceUserPermissionsDto extends createStrictZodDto(
  ReplaceUserPermissionsSchema,
) {}
