import { createStrictZodDto } from '#src/core/index.js';
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

// ---------- Forget Password ----------
export const ForgetPasswordSchema = z.object({
  email: z
    .email({ message: 'validation.email.invalid' })
    .describe('User Email'),
});

export class ForgetPasswordDto extends createStrictZodDto(
  ForgetPasswordSchema,
) {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  email!: string;
}

// ---------- Reset Password ----------
export const ResetPasswordSchema = z.object({
  token: z
    .string({ message: 'validation.mixed.required' })
    .min(1, { message: 'validation.token.required' })
    .describe('Reset Token'),
  newPassword: z
    .string({ message: 'validation.mixed.required' })
    .min(8, { message: 'validation.password.min_length' })
    .max(32, { message: 'validation.password.max_length' })
    .describe('New Password'),
});

export class ResetPasswordDto extends createStrictZodDto(ResetPasswordSchema) {
  @ApiProperty({
    example: 'reset-token-123',
    description: 'Token received via email',
  })
  token!: string;

  @ApiProperty({ example: 'NewStrongP@ssw0rd!', description: 'New password' })
  newPassword!: string;
}

// ---------- Change Password ----------
export const ChangePasswordSchema = z.object({
  currentPassword: z
    .string({ message: 'validation.mixed.required' })
    .min(1, { message: 'validation.mixed.required' })
    .describe('Current Password'),
  newPassword: z
    .string({ message: 'validation.mixed.required' })
    .min(8, { message: 'validation.password.min_length' })
    .max(32, { message: 'validation.password.max_length' })
    .describe('New Password'),
  revokeOtherSessions: z.boolean().optional().describe('Revoke other sessions'),
});

export class ChangePasswordDto extends createStrictZodDto(
  ChangePasswordSchema,
) {
  @ApiProperty({ example: 'OldP@ssw0rd!', description: 'Current password' })
  currentPassword!: string;

  @ApiProperty({ example: 'NewStrongP@ssw0rd!', description: 'New password' })
  newPassword!: string;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Revoke other active sessions',
  })
  revokeOtherSessions?: boolean;
}

// ---------- Verify Password ----------
const VerifyPasswordSchema = z.object({
  password: z
    .string({ message: 'validation.mixed.required' })
    .min(1, { message: 'validation.password.required' })
    .describe('Current Password'),
});

export class VerifyPasswordDto extends createStrictZodDto(
  VerifyPasswordSchema,
) {
  @ApiProperty({
    description: 'The password to verify',
    example: 'A-Long-Random-Passphrase-123!',
  })
  password!: string;
}
