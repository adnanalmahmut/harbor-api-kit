import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { createStrictZodDto } from '../strict-zod-dto.js';

describe('createStrictZodDto', () => {
  test('createZodDto (default) does NOT forbid unknown keys', () => {
    const Schema = z
      .object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.email(),
        password: z.string(),
        confirmPassword: z.string(),
      })
      .refine((d) => d.password === d.confirmPassword, {
        path: ['confirmPassword'],
        message: 'no_match',
      });

    class Dto extends createZodDto(Schema) {}

    const result = (Dto as any).schema.safeParse({
      firstName: 'Ahmad',
      lastName: 'Mahmoud',
      email: 'user@example.com',
      password: 'StrongP@ssw0rd!',
      confirmPassword: 'StrongP@ssw0rd!',
      role: 'admin', // unknown key
    });

    expect(result.success).toBe(true);
  });

  test('createStrictZodDto forbids unknown keys even with refine()', () => {
    const Schema = z
      .object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email(),
        password: z.string(),
        confirmPassword: z.string(),
      })
      .refine((d) => d.password === d.confirmPassword, {
        path: ['confirmPassword'],
        message: 'no_match',
      });

    class StrictDto extends createStrictZodDto(Schema) {}

    const result = (StrictDto as any).schema.safeParse({
      firstName: 'Ahmad',
      lastName: 'Mahmoud',
      email: 'user@example.com',
      password: 'StrongP@ssw0rd!',
      confirmPassword: 'StrongP@ssw0rd!',
      role: 'admin', // unknown key
    });

    expect(result.success).toBe(false);

    // Ensure the failure is due to "unrecognized_keys" and includes our key
    const issues = result.error?.issues ?? [];
    const hasUnrecognized = issues.some(
      (i: any) =>
        i.code === 'unrecognized_keys' &&
        Array.isArray(i.keys) &&
        i.keys.includes('role'),
    );

    expect(hasUnrecognized).toBe(true);
  });
});
