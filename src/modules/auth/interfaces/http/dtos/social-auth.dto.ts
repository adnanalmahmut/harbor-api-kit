import { createStrictZodDto } from '#src/infrastructure/validation/strict-zod-dto.js';
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

// ---------- Sign In / Link Social ----------
const SocialProviderSchema = z.enum(['google', 'github']);

const SignInSocialSchema = z.object({
  provider: SocialProviderSchema,
  callbackURL: z.string().url().optional(),
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

// ---------- Unlink Account ----------
const UnlinkAccountSchema = z.object({
  providerId: SocialProviderSchema,
});

export class UnlinkAccountDto extends createStrictZodDto(UnlinkAccountSchema) {
  @ApiProperty({ enum: ['google', 'github'], example: 'google' })
  providerId!: 'google' | 'github';
}

// ---------- Linked Account Response ----------
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

