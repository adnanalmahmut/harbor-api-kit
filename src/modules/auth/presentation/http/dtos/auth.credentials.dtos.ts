import { createStrictZodDto } from '#src/core/index.js';
import { UserResponseDto } from '#src/modules/users/index.js';
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

export { UserResponseDto };

// ---------- Login ----------
export const LoginSchema = z.object({
  email: z
    .email({ message: 'validation.email.invalid' })
    .describe('User Email'),
  password: z
    .string({ message: 'validation.mixed.required' })
    .min(1, { message: 'validation.mixed.required' })
    .describe('Password'),
  rememberMe: z.boolean().optional().describe('Remember session'),
  redirect: z.boolean().optional().describe('Redirect to callback URL'),
  callbackURL: z
    .url({ message: 'validation.url.invalid' })
    .optional()
    .describe('Callback URL'),
});

export class LoginDto extends createStrictZodDto(LoginSchema) {
  @ApiProperty({
    example: 'admin@coreapi.com',
    description: 'User email address',
  })
  email!: string;

  @ApiProperty({ example: 'StrongP@ssw0rd!', description: 'User password' })
  password!: string;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Keep session active',
  })
  rememberMe?: boolean;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Redirect to callback URL',
  })
  redirect?: boolean;

  @ApiProperty({
    example: 'http://localhost:5000',
    required: false,
    description: 'Callback URL',
  })
  callbackURL?: string;
}

// ---------- Register ----------
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

// =====================================================
// Response DTOs
// =====================================================

export class SignUpResponseDto {
  @ApiProperty({
    type: UserResponseDto,
    description:
      'Registered user. Authentication is established with HttpOnly session cookies returned in Set-Cookie headers.',
  })
  user!: UserResponseDto;
}

export class SignInResponseDto {
  @ApiProperty({ example: true })
  redirect!: boolean;

  @ApiProperty({ example: 'http://localhost:5000', required: false })
  url?: string;

  @ApiProperty({
    type: UserResponseDto,
    description:
      'Authenticated user. Authentication is established with HttpOnly session cookies returned in Set-Cookie headers.',
  })
  user!: UserResponseDto;
}
