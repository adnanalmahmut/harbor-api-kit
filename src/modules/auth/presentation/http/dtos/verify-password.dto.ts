import { createStrictZodDto } from '#src/core/validation/strict-zod-dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

const VerifyPasswordSchema = z.object({
  password: z
    .string({ message: 'validation.mixed.required' })
    .min(1, { message: 'validation.password.required' })
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
