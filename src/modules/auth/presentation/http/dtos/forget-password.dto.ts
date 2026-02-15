import { createStrictZodDto } from '#src/core/presentation/http/validation/strict-zod-dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

export const ForgetPasswordSchema = z.object({
  email: z
    .email({ message: 'validation.email.invalid' })
    .describe('User Email'),
});

export class ForgetPasswordDto extends createStrictZodDto(
  ForgetPasswordSchema,
) {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  email!: string;
}
