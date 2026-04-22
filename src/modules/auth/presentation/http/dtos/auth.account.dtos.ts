import { SUPPORTED_LOCALES, createStrictZodDto } from '#src/core/index.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

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

// =====================================================
// Response DTOs
// =====================================================

export class StatusResponseDto {
  @ApiProperty({ example: true })
  status!: boolean;
}
