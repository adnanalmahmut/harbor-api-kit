import { createStrictZodDto } from '#src/infrastructure/validation/strict-zod-dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

export const ChangePasswordSchema = z.object({
  currentPassword: z
    .string({ message: 'errors.validation.mixed.required' })
    .min(1, { message: 'errors.validation.mixed.required' })
    .describe('Current Password'),
  newPassword: z
    .string({ message: 'errors.validation.mixed.required' })
    .min(8, { message: 'errors.validation.password.min_length' })
    .max(32, { message: 'errors.validation.password.max_length' })
    .describe('New Password'),
  revokeOtherSessions: z.boolean().optional().describe('Revoke other sessions'),
});

export class ChangePasswordDto extends createStrictZodDto(
  ChangePasswordSchema,
) {
  @ApiProperty({ example: 'OldP@ssw0rd!', description: 'Current password' })
  currentPassword!: string;

  @ApiProperty({ example: 'NewStrongP@ssw0rd!', description: 'New password' })
  newPassword!: string;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Revoke other active sessions',
  })
  revokeOtherSessions?: boolean;
}
