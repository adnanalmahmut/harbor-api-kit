import { createStrictZodDto } from '#src/core/index.js';
import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import { UserResponseDto } from '#src/modules/users/index.js';

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
