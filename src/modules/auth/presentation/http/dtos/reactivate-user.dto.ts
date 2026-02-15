import { createStrictZodDto } from '#src/core/presentation/http/validation/strict-zod-dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

const ReactivateUserSchema = z.object({
  email: z.email(),
});

export class ReactivateUserDto extends createStrictZodDto(
  ReactivateUserSchema,
) {
  @ApiProperty({ example: 'john@example.com' })
  email!: string;
}
