import { createStrictZodDto } from '#src/core/index.js';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.email(),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  locale: z.string().optional(),
});

export class CreateUserDto extends createStrictZodDto(createUserSchema) {}
