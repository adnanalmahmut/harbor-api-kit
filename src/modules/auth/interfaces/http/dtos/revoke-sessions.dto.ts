import { createStrictZodDto } from '#src/infrastructure/validation/strict-zod-dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

const RevokeSessionsSchema = z.object({
  tokens: z
    .array(
      z
        .string({ message: 'errors.validation.mixed.required' })
        .min(1, { message: 'errors.validation.token.required' }),
    )
    .min(1, { message: 'errors.validation.tokens.required' })
    .describe('Session Tokens'),
});

export class RevokeSessionsDto extends createStrictZodDto(
  RevokeSessionsSchema,
) {
  @ApiProperty({
    description: 'List of session tokens to revoke',
    example: ['token1', 'token2'],
  })
  tokens!: string[];
}
