import { createStrictZodDto } from '#src/infrastructure/validation/strict-zod-dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

const RevokeSessionSchema = z.object({
  token: z
    .string({ message: 'errors.validation.mixed.required' })
    .min(1, { message: 'errors.validation.token.required' })
    .describe('Session Token'),
});

export class RevokeSessionDto extends createStrictZodDto(RevokeSessionSchema) {
  @ApiProperty({
    description: 'The session token to revoke',
    example: 'session_token_123',
  })
  token!: string;
}
