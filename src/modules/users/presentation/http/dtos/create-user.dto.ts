import { createStrictZodDto } from '#src/core/presentation/http/validation/strict-zod-dto.js';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  locale: z.string().optional(),
});

export class CreateUserDto extends createStrictZodDto(createUserSchema) {}
