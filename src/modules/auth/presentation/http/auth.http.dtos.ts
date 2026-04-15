import { SUPPORTED_LOCALES, createStrictZodDto } from '#src/core/index.js';
import type { User } from '#src/modules/auth/domain/index.js';
import { UserResponseDto } from '#src/modules/users/presentation/http/dtos/users-response.dto.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';
export { UserResponseDto };

// =====================================================
// Response DTOs
// =====================================================

export class SessionResponseDto {
  @ApiProperty({ example: 'sess_123' })
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ required: false })
  token?: string;

  @ApiProperty()
  expiresAt!: Date;

  @ApiProperty({ required: false, nullable: true })
  ipAddress?: string | null;

  @ApiProperty({ required: false, nullable: true })
  userAgent?: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'Istanbul' })
  city?: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'TR' })
  country?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class SignUpResponseDto {
  @ApiProperty({ description: 'Authentication token' })
  token!: string;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}

export class SignInResponseDto {
  @ApiProperty({ example: true })
  redirect!: boolean;

  @ApiProperty({
    example: 'RFMCcFS8Qb6Gr0NZgrCqdSke8v3rjNj0',
    description: 'Authentication token',
  })
  token!: string;

  @ApiProperty({ example: 'http://localhost:5000', required: false })
  url?: string;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}

export class GetSessionResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;

  @ApiProperty({ type: SessionResponseDto })
  session!: SessionResponseDto;
}

export class ListSessionsResponseDto {
  @ApiProperty({ type: [SessionResponseDto] })
  sessions!: SessionResponseDto[];
}

export class StatusResponseDto {
  @ApiProperty({ example: true })
  status!: boolean;
}

export class SocialSignInResponseDto {
  @ApiProperty({ example: true })
  redirect!: boolean;

  @ApiProperty({ example: 'RFMCcFS8Qb6Gr0NZgrCqdSke8v3rjNj0' })
  token!: string;

  @ApiProperty({
    example:
      'https://accounts.google.com/o/oauth2/auth?response_type=code&client_id=1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback&scope=openid%20email%20profile&state=xyz123',
    required: false,
  })
  url?: string;

  @ApiProperty({ example: null })
  user!: User;
}

export class LinkedAccountDto {
  @ApiProperty({ example: 'acc_123' })
  id!: string;

  @ApiProperty({ example: 'google' })
  provider!: string;

  @ApiProperty({ example: 'google' })
  providerId!: string;

  @ApiProperty({ example: '123456789' })
  accountId!: string;

  @ApiProperty()
  createdAt!: Date;
}

// =====================================================
// Request DTOs + Schemas
// =====================================================

// ---------- Change Email ----------
export const ChangeEmailSchema = z.object({
  newEmail: z
    .email({ message: 'validation.email.invalid' })
    .describe('New Email Address'),
  callbackURL: z
    .url({ message: 'validation.url.invalid' })
    .optional()
    .describe('Callback URL'),
});

export class ChangeEmailDto extends createStrictZodDto(ChangeEmailSchema) {
  @ApiProperty({
    example: 'new-email@example.com',
    description: 'New email address',
  })
  newEmail!: string;

  @ApiProperty({
    example: 'https://frontend.com/verify-email',
    required: false,
    description: 'Callback URL',
  })
  callbackURL?: string;
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

// ---------- Reactivate User ----------
const ReactivateUserSchema = z.object({
  email: z.email(),
});

export class ReactivateUserDto extends createStrictZodDto(
  ReactivateUserSchema,
) {
  @ApiProperty({ example: 'john@example.com' })
  email!: string;
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

// ---------- Revoke Session ----------
const RevokeSessionSchema = z.object({
  sessionId: z
    .string({ message: 'validation.mixed.required' })
    .min(1, { message: 'validation.id.required' })
    .describe('Session ID'),
});

export class RevokeSessionDto extends createStrictZodDto(RevokeSessionSchema) {
  @ApiProperty({
    description: 'The session ID to revoke',
    example: 'session_id_123',
  })
  sessionId!: string;
}

// ---------- Revoke Sessions ----------
const RevokeSessionsSchema = z.object({
  sessionIds: z
    .array(
      z
        .string({ message: 'validation.mixed.required' })
        .min(1, { message: 'validation.id.required' }),
    )
    .min(1, { message: 'validation.ids.required' })
    .describe('Session IDs'),
});

export class RevokeSessionsDto extends createStrictZodDto(
  RevokeSessionsSchema,
) {
  @ApiProperty({
    description: 'List of session IDs to revoke',
    example: ['id1', 'id2'],
  })
  sessionIds!: string[];
}

// ---------- Send Verification Email ----------
const SendVerificationEmailSchema = z.object({
  email: z
    .email({ message: 'validation.email.invalid' })
    .describe('User Email'),
});

export class SendVerificationEmailDto extends createStrictZodDto(
  SendVerificationEmailSchema,
) {
  @ApiProperty({
    description: 'The email address to send verification to',
    example: 'user@example.com',
  })
  email!: string;
}

// ---------- Sign Out ----------
export const SignOutSchema = z.object({
  token: z.string().optional().describe('Session Token'),
});

export class SignOutDto extends createStrictZodDto(SignOutSchema) {
  @ApiProperty({
    example: 'session_token',
    required: false,
    description: 'Specific session token to sign out',
  })
  token?: string;
}

// ---------- Social (Sign In / Link / Unlink) ----------
const SocialProviderSchema = z.enum(['google', 'github']);

const SignInSocialSchema = z.object({
  provider: SocialProviderSchema,
  callbackURL: z.url().optional(),
});

export class SignInSocialDto extends createStrictZodDto(SignInSocialSchema) {
  @ApiProperty({ enum: ['google', 'github'], example: 'google' })
  provider!: 'google' | 'github';

  @ApiProperty({
    required: false,
    example: 'https://app.example.com/dashboard',
  })
  callbackURL?: string;
}

export class LinkSocialDto extends createStrictZodDto(SignInSocialSchema) {
  @ApiProperty({ enum: ['google', 'github'], example: 'google' })
  provider!: 'google' | 'github';

  @ApiProperty({ required: false, example: 'https://app.example.com/settings' })
  callbackURL?: string;
}

const UnlinkAccountSchema = z.object({
  providerId: SocialProviderSchema,
});

export class UnlinkAccountDto extends createStrictZodDto(UnlinkAccountSchema) {
  @ApiProperty({ enum: ['google', 'github'], example: 'google' })
  providerId!: 'google' | 'github';
}

// ---------- Update User ----------
const UpdateUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  image: z.union([z.literal(''), z.url()]).optional(),
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

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.jpg',
    description: 'Use an empty string to clear the stored image.',
  })
  image?: string;

  @ApiPropertyOptional({ example: 'en-US' })
  locale?: string;
}

// ---------- Verify Email ----------
export const VerifyEmailSchema = z.object({
  token: z
    .string({ message: 'validation.mixed.required' })
    .min(1, { message: 'validation.token.required' })
    .describe('Verification Token'),
});

export class VerifyEmailDto extends createStrictZodDto(VerifyEmailSchema) {
  @ApiProperty({ example: 'token_12345', description: 'Verification Token' })
  token!: string;
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
    example: 'password123',
  })
  password!: string;
}
