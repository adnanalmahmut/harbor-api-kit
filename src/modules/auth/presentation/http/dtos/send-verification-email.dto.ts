import { createStrictZodDto } from '#src/core/validation/strict-zod-dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

const SendVerificationEmailSchema = z.object({
  email: z
    .string({ message: 'validation.mixed.required' })
    .email({ message: 'validation.email.invalid' })
    .describe('User Email'),
});

export class SendVerificationEmailDto extends createStrictZodDto(
  SendVerificationEmailSchema,
) {
  @ApiProperty({
    description: 'The email address to send verification to',
    example: 'user@example.com',
  })
  email!: string;
}
