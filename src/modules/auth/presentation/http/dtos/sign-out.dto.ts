import { createStrictZodDto } from '#src/core/presentation/http/validation/strict-zod-dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

export const SignOutSchema = z.object({
  token: z.string().optional().describe('Session Token'),
});

export class SignOutDto extends createStrictZodDto(SignOutSchema) {
  @ApiProperty({
    example: 'session_token',
    required: false,
    description: 'Specific session token to sign out',
  })
  token?: string;
}
