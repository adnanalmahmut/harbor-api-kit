import { createStrictZodDto } from '#src/core/index.js';
import type { User } from '../../../domain/index.js';
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

// ---------- Schemas ----------
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

// =====================================================
// Response DTOs
// =====================================================

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
