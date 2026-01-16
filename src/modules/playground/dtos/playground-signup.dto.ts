import { createStrictZodDto } from '#src/infrastructure/validation/strict-zod-dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

const PlaygroundSignupSchema = z
  .object({
    firstName: z
      .string({ message: 'errors.validation.mixed.required' })
      .min(2, { message: 'errors.validation.user.first_name.min' })
      .max(50, { message: 'errors.validation.user.first_name.max' })
      .regex(/^[\p{L}\s]+$/u, {
        message: 'errors.validation.user.first_name.pattern',
      })
      .describe('الاسم الأول'),

    lastName: z
      .string({ message: 'errors.validation.mixed.required' })
      .min(2, { message: 'errors.validation.user.last_name.min' })
      .max(50, { message: 'errors.validation.user.last_name.max' })
      .regex(/^[\p{L}\s]+$/u, {
        message: 'errors.validation.user.last_name.pattern',
      })
      .describe('الاسم الأخير'),

    email: z
      .email({ message: 'errors.validation.email.invalid' })
      .describe('البريد الإلكتروني'),

    password: z
      .string({ message: 'errors.validation.mixed.required' })
      .min(8, { message: 'errors.validation.password.min_length' })
      .max(32, { message: 'errors.validation.password.max_length' })
      .describe('كلمة المرور'),

    confirmPassword: z
      .string({ message: 'errors.validation.mixed.required' })
      .describe('تأكيد كلمة المرور'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'errors.validation.password.no_match',
    path: ['confirmPassword'],
  });

export class PlaygroundSignupDto extends createStrictZodDto(
  PlaygroundSignupSchema,
) {
  @ApiProperty({ example: 'أحمد', description: 'الاسم الأول (أحرف فقط)' })
  firstName!: string;

  @ApiProperty({ example: 'المحمود', description: 'الاسم الأخير (أحرف فقط)' })
  lastName!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'StrongP@ssw0rd!' })
  password!: string;

  @ApiProperty({
    example: 'StrongP@ssw0rd!',
    description: 'يجب أن يطابق كلمة المرور',
  })
  confirmPassword!: string;
}
