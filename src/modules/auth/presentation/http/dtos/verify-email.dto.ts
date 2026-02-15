import { createStrictZodDto } from '#src/core/presentation/http/validation/strict-zod-dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

export const VerifyEmailSchema = z.object({
  token: z
    .string({ message: 'validation.mixed.required' })
    .min(1, { message: 'validation.token.required' })
    .describe('Verification Token'),
});

export class VerifyEmailDto extends createStrictZodDto(VerifyEmailSchema) {
  @ApiProperty({ example: 'token_12345', description: 'Verification Token' })
  token!: string;
}
