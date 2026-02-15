import { ApiProperty } from '@nestjs/swagger';

/**
 * RBAC module response DTOs for Swagger documentation
 */

// Permission Key
export class PermissionKeyDto {
  @ApiProperty({ example: 'users' })
  subject!: string;

  @ApiProperty({ example: 'read' })
  action!: string;
}

// Role Response
export class RoleResponseDto {
  @ApiProperty({ example: 'role_123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 'Admin' })
  name!: string;

  @ApiProperty({ example: 'admin' })
  slug!: string;

  @ApiProperty({
    required: false,
    example: 'Administrator role with full access',
  })
  description?: string;

  @ApiProperty({ example: true })
  isSystem!: boolean;

  @ApiProperty({ example: '2026-02-01T06:58:00.450Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-02-01T06:58:00.450Z' })
  updatedAt!: Date;
}

// Role with Permissions
export class RoleWithPermissionsResponseDto extends RoleResponseDto {
  @ApiProperty({ type: [String], example: ['users:read', 'users:create'] })
  permissions!: string[];
}

// List Roles Response
export class ListRolesResponseDto {
  @ApiProperty({ type: [RoleResponseDto] })
  roles!: RoleResponseDto[];
}

// Permission Response
export class PermissionResponseDto {
  @ApiProperty({ example: 'perm_123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ type: PermissionKeyDto })
  key!: PermissionKeyDto;

  @ApiProperty({ required: false, example: 'Read users permission' })
  description?: string;

  @ApiProperty({ example: '2026-02-01T06:58:00.450Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-02-01T06:58:00.450Z' })
  updatedAt!: Date;
}

// List Permissions Response
export class ListPermissionsResponseDto {
  @ApiProperty({ type: [PermissionResponseDto] })
  permissions!: PermissionResponseDto[];
}

// Role Permissions Response
export class RolePermissionsResponseDto {
  @ApiProperty({ type: [PermissionResponseDto] })
  permissions!: PermissionResponseDto[];
}

// Success Message Response
export class MessageResponseDto {
  @ApiProperty({ example: 'Operation completed successfully' })
  message!: string;
}
