import { createStrictZodDto } from '#src/core/index.js';
import { isPermissionKey } from '../../../domain/permissions.catalog.js';
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
