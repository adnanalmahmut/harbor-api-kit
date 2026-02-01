import { ApiProperty } from '@nestjs/swagger';

/**
 * Users module response DTOs for Swagger documentation
 */

// Base User Response
export class UserResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: true })
  emailVerified!: boolean;

  @ApiProperty({ example: 'John Doe' })
  name!: string;

  @ApiProperty({ required: false, nullable: true, example: null })
  image?: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'John' })
  firstName?: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'Doe' })
  lastName?: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'en-US' })
  locale?: string | null;

  @ApiProperty({ required: false, type: [String], example: ['user'] })
  roles?: string[];

  @ApiProperty({ required: false, type: [String], example: ['users:read'] })
  permissions?: string[];

  @ApiProperty({ example: '2026-02-01T06:58:00.450Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-02-01T06:58:00.450Z' })
  updatedAt!: Date;
}

// List Users Response
export class ListUsersResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  users!: UserResponseDto[];
}

// Role Response (for user roles)
import { RoleResponseDto } from '#src/modules/rbac/presentation/http/dtos/rbac-response.dto.js';

export { RoleResponseDto };

// User Roles Response
export class UserRolesResponseDto {
  @ApiProperty({ type: [RoleResponseDto] })
  roles!: RoleResponseDto[];
}

// Permission Key Response
export class PermissionKeyResponseDto {
  @ApiProperty({ example: 'users' })
  subject!: string;

  @ApiProperty({ example: 'read' })
  action!: string;
}

// Permission Override Response
export class PermissionOverrideResponseDto {
  @ApiProperty({ example: 'perm_123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ type: PermissionKeyResponseDto })
  key!: PermissionKeyResponseDto;

  @ApiProperty({ required: false, example: 'Read users permission' })
  description?: string;
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
    example: ['users:read', 'users:create', 'users:update'],
  })
  permissions!: string[];
}

// Success Message Response
export class MessageResponseDto {
  @ApiProperty({ example: 'Operation completed successfully' })
  message!: string;
}
