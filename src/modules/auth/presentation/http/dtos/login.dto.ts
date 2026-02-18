import { createStrictZodDto } from '#src/core/presentation/http/validation/strict-zod-dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

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
    example: 'https://example.com',
    required: false,
    description: 'Callback URL',
  })
  callbackURL?: string;
}
