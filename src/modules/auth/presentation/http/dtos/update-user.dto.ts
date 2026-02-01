import { SUPPORTED_LOCALES } from '#src/core/constants/locales.js';
import { createStrictZodDto } from '#src/core/validation/strict-zod-dto.js';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

const UpdateUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  image: z.string().url().optional(),
  locale: z
    .string()
    .refine((val) => (SUPPORTED_LOCALES as readonly string[]).includes(val), {
      message: 'auth.errors.invalid_locale',
    })
    .optional(),
});

export class UpdateUserDto extends createStrictZodDto(UpdateUserSchema) {
  @ApiPropertyOptional({ example: 'John' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  lastName?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  image?: string;

  @ApiPropertyOptional({ example: 'en-US' })
  locale?: string;
}
