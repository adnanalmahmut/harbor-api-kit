import { createStrictZodDto } from '#src/core/presentation/http/validation/strict-zod-dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

const RevokeSessionSchema = z.object({
  sessionId: z
    .string({ message: 'validation.mixed.required' })
    .min(1, { message: 'validation.id.required' })
    .describe('Session ID'),
});

export class RevokeSessionDto extends createStrictZodDto(RevokeSessionSchema) {
  @ApiProperty({
    description: 'The session ID to revoke',
    example: 'session_id_123',
  })
  sessionId!: string;
}
