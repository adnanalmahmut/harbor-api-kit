import { ApiProperty } from '@nestjs/swagger';

/**
 * Authorization module response DTOs for Swagger documentation.
 */

// Permission Key Response
export class PermissionKeyResponseDto {
  @ApiProperty({ example: 'user' })
  subject!: string;

  @ApiProperty({ example: 'list' })
  action!: string;
}

// Permission Override Response
export class PermissionOverrideResponseDto {
  @ApiProperty({ type: PermissionKeyResponseDto })
  key!: PermissionKeyResponseDto;

  @ApiProperty({ enum: ['ALLOW', 'DENY'] })
  effect!: 'ALLOW' | 'DENY';

  @ApiProperty({ required: false, example: 'Temporary exception' })
  note?: string;
}

// User Permissions Response
export class UserPermissionsResponseDto {
  @ApiProperty({
    type: [PermissionOverrideResponseDto],
    description: 'Allowed permissions',
  })
  allow!: PermissionOverrideResponseDto[];

  @ApiProperty({
    type: [PermissionOverrideResponseDto],
    description: 'Denied permissions',
  })
  deny!: PermissionOverrideResponseDto[];
}

// Effective Permissions Response
export class EffectivePermissionsResponseDto {
  @ApiProperty({ type: [String], example: ['admin', 'user'] })
  roles!: string[];

  @ApiProperty({
    type: [String],
    example: ['user:list', 'user:create', 'user:update'],
  })
  permissions!: string[];
}
