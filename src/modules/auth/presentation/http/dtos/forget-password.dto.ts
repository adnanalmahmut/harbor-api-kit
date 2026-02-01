import { createStrictZodDto } from '#src/infrastructure/validation/strict-zod-dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

export const ForgetPasswordSchema = z.object({
  email: z
    .string({ message: 'validation.mixed.required' })
    .email({ message: 'validation.email.invalid' })
    .describe('User Email'),
  redirectTo: z
    .string()
    .url({ message: 'validation.url.invalid' })
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

