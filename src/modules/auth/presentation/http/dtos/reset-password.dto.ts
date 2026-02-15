import { createStrictZodDto } from '#src/core/presentation/http/validation/strict-zod-dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

export const ResetPasswordSchema = z.object({
  token: z
    .string({ message: 'validation.mixed.required' })
    .min(1, { message: 'validation.token.required' })
    .describe('Reset Token'),
  newPassword: z
    .string({ message: 'validation.mixed.required' })
    .min(8, { message: 'validation.password.min_length' })
    .max(32, { message: 'validation.password.max_length' })
    .describe('New Password'),
});

export class ResetPasswordDto extends createStrictZodDto(ResetPasswordSchema) {
  @ApiProperty({
    example: 'reset-token-123',
    description: 'Token received via email',
  })
  token!: string;

  @ApiProperty({ example: 'NewStrongP@ssw0rd!', description: 'New password' })
  newPassword!: string;
}
