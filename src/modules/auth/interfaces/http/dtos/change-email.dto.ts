import { createStrictZodDto } from '#src/infrastructure/validation/strict-zod-dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

export const ChangeEmailSchema = z.object({
  newEmail: z
    .string({ message: 'errors.validation.mixed.required' })
    .email({ message: 'errors.validation.email.invalid' })
    .describe('New Email Address'),
  callbackURL: z
    .string()
    .url({ message: 'errors.validation.url.invalid' })
    .optional()
    .describe('Callback URL'),
});

export class ChangeEmailDto extends createStrictZodDto(ChangeEmailSchema) {
  @ApiProperty({
    example: 'new-email@example.com',
    description: 'New email address',
  })
  newEmail!: string;

  @ApiProperty({
    example: 'https://frontend.com/verify-email',
    required: false,
    description: 'Callback URL',
  })
  callbackURL?: string;
}
