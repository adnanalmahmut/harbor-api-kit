import { createStrictZodDto } from '#src/core/presentation/http/validation/strict-zod-dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

const RevokeSessionsSchema = z.object({
  sessionIds: z
    .array(
      z
        .string({ message: 'validation.mixed.required' })
        .min(1, { message: 'validation.id.required' }),
    )
    .min(1, { message: 'validation.ids.required' })
    .describe('Session IDs'),
});

export class RevokeSessionsDto extends createStrictZodDto(
  RevokeSessionsSchema,
) {
  @ApiProperty({
    description: 'List of session IDs to revoke',
    example: ['id1', 'id2'],
  })
  sessionIds!: string[];
}
