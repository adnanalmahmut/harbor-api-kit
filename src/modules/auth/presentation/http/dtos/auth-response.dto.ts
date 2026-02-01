import type {
  GetSessionResult,
  Session,
  SignInResultData,
  SignUpResultData,
  User,
} from '#src/modules/auth/application/ports/auth-dtos.js';
import { ApiProperty } from '@nestjs/swagger';

import { UserResponseDto } from '#src/modules/users/presentation/http/dtos/users-response.dto.js';

export { UserResponseDto };

export class SessionResponseDto implements Session {
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

export class SignUpResponseDto implements SignUpResultData {
  @ApiProperty({ description: 'Authentication token' })
  token!: string;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}

export class SignInResponseDto implements SignInResultData {
  @ApiProperty({ example: true })
  redirect!: boolean;

  @ApiProperty({
    example: 'RFMCcFS8Qb6Gr0NZgrCqdSke8v3rjNj0',
    description: 'Authentication token',
  })
  token!: string;

  @ApiProperty({ example: 'https://example.com', required: false })
  url?: string;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}

export class GetSessionResponseDto implements NonNullable<GetSessionResult> {
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

export class SocialSignInResponseDto implements SignInResultData {
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
