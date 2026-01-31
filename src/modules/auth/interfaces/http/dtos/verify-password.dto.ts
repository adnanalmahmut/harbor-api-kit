import { createStrictZodDto } from '#src/infrastructure/validation/strict-zod-dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

const VerifyPasswordSchema = z.object({
  password: z
    .string({ message: 'errors.validation.mixed.required' })
    .min(1, { message: 'errors.validation.password.required' })
    .describe('Current Password'),
});

export class VerifyPasswordDto extends createStrictZodDto(
  VerifyPasswordSchema,
) {
  @ApiProperty({
    description: 'The password to verify',
    example: 'password123',
  })
  password!: string;
}
