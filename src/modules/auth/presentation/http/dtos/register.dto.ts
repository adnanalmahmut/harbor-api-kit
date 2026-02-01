import { createStrictZodDto } from '#src/core/validation/strict-zod-dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

const nameRegex = /^[\p{L}\s.'-]+$/u;

export const RegisterSchema = z
  .object({
    firstName: z
      .string({ message: 'validation.mixed.required' })
      .min(2, { message: 'validation.user.first_name.min' })
      .max(50, { message: 'validation.user.first_name.max' })
      .regex(nameRegex, {
        message: 'validation.user.first_name.pattern',
      })
      .describe('First name'),

    lastName: z
      .string({ message: 'validation.mixed.required' })
      .min(2, { message: 'validation.user.last_name.min' })
      .max(50, { message: 'validation.user.last_name.max' })
      .regex(nameRegex, {
        message: 'validation.user.last_name.pattern',
      })
      .describe('Last name'),

    email: z
      .string({ message: 'validation.mixed.required' })
      .email({ message: 'validation.email.invalid' })
      .max(254, { message: 'validation.email.max' })
      .describe('Email'),

    password: z
      .string({ message: 'validation.mixed.required' })
      .min(8, { message: 'validation.password.min_length' })
      .max(72, { message: 'validation.password.max_length' })
      .describe('Password'),

    confirmPassword: z
      .string({ message: 'validation.mixed.required' })
      .describe('Confirm Password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'validation.password.no_match',
    path: ['confirmPassword'],
  });

export class RegisterDto extends createStrictZodDto(RegisterSchema) {
  @ApiProperty({ example: 'Adnan', description: 'First name' })
  firstName!: string;

  @ApiProperty({ example: 'Mahmoud', description: 'Last name' })
  lastName!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'StrongP@ssw0rd!' })
  password!: string;

  @ApiProperty({ example: 'StrongP@ssw0rd!', description: 'Confirm Password' })
  confirmPassword!: string;
}
