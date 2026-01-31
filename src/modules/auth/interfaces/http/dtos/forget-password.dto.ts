import { createStrictZodDto } from '#src/infrastructure/validation/strict-zod-dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

export const ForgetPasswordSchema = z.object({
  email: z
    .string({ message: 'errors.validation.mixed.required' })
    .email({ message: 'errors.validation.email.invalid' })
    .describe('User Email'),
  redirectTo: z
    .string()
    .url({ message: 'errors.validation.url.invalid' })
    .optional()
    .describe('Redirect URL'),
});

export class ForgetPasswordDto extends createStrictZodDto(
  ForgetPasswordSchema,
) {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  email!: string;

  @ApiProperty({
    example: 'https://frontend.com/reset-password',
    required: false,
    description: 'Redirect URL after processing',
  })
  redirectTo?: string;
}
