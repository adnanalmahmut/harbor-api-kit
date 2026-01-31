import { AppErrorCode } from '#src/core/exceptions/error-definitions.js';
import { ApiErrors } from '#src/infrastructure/http/decorators/api-errors.decorator.js';
import { ResponseMessage } from '#src/infrastructure/http/decorators/response-message.decorator.js';
import { AuthGuard } from '#src/modules/auth/interfaces/http/guards/auth.guard.js';
import { AssignPermissionToRoleUseCase } from '#src/modules/rbac/application/use-cases/assign-permission-to-role.use-case.js';
import { CreatePermissionUseCase } from '#src/modules/rbac/application/use-cases/create-permission.use-case.js';
import { CreateRoleUseCase } from '#src/modules/rbac/application/use-cases/create-role.use-case.js';
import { DeletePermissionUseCase } from '#src/modules/rbac/application/use-cases/delete-permission.use-case.js';
import { DeleteRoleUseCase } from '#src/modules/rbac/application/use-cases/delete-role.use-case.js';
import { GetPermissionByIdUseCase } from '#src/modules/rbac/application/use-cases/get-permission-by-id.use-case.js';
import { GetRoleByIdUseCase } from '#src/modules/rbac/application/use-cases/get-role-by-id.use-case.js';
import { GetRolePermissionsUseCase } from '#src/modules/rbac/application/use-cases/get-role-permissions.use-case.js';
import { ListPermissionsUseCase } from '#src/modules/rbac/application/use-cases/list-permissions.use-case.js';
import { ListRolesUseCase } from '#src/modules/rbac/application/use-cases/list-roles.use-case.js';
import { RemovePermissionFromRoleUseCase } from '#src/modules/rbac/application/use-cases/remove-permission-from-role.use-case.js';
import { ReplaceRolePermissionsUseCase } from '#src/modules/rbac/application/use-cases/replace-role-permissions.use-case.js';
import { UpdatePermissionUseCase } from '#src/modules/rbac/application/use-cases/update-permission.use-case.js';
import { UpdateRoleUseCase } from '#src/modules/rbac/application/use-cases/update-role.use-case.js';
import { Roles } from '#src/modules/rbac/presentation/http/decorators/roles.decorator.js';
import { AssignPermissionDto } from '#src/modules/rbac/presentation/http/dtos/assign-permission.dto.js';
import { CreatePermissionDto } from '#src/modules/rbac/presentation/http/dtos/create-permission.dto.js';
import { CreateRoleDto } from '#src/modules/rbac/presentation/http/dtos/create-role.dto.js';
import { ReplaceRolePermissionsDto } from '#src/modules/rbac/presentation/http/dtos/replace-role-permissions.dto.js';
import { UpdatePermissionDto } from '#src/modules/rbac/presentation/http/dtos/update-permission.dto.js';
import { UpdateRoleDto } from '#src/modules/rbac/presentation/http/dtos/update-role.dto.js';
import { RbacGuard } from '#src/modules/rbac/presentation/http/guards/rbac.guard.js';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';

@ApiTags('Admin / RBAC')
@ApiBearerAuth()
@UseGuards(AuthGuard, RbacGuard)
@Roles(['admin'])
@Controller('admin')
export class RbacController {
  constructor(
    private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly listRolesUseCase: ListRolesUseCase,
    private readonly createPermissionUseCase: CreatePermissionUseCase,
    private readonly listPermissionsUseCase: ListPermissionsUseCase,
    private readonly assignPermissionUseCase: AssignPermissionToRoleUseCase,
    private readonly removePermissionUseCase: RemovePermissionFromRoleUseCase,
    private readonly getRolePermissionsUseCase: GetRolePermissionsUseCase,
    private readonly getRoleByIdUseCase: GetRoleByIdUseCase,
    private readonly updateRoleUseCase: UpdateRoleUseCase,
    private readonly deleteRoleUseCase: DeleteRoleUseCase,
    private readonly getPermissionByIdUseCase: GetPermissionByIdUseCase,
    private readonly updatePermissionUseCase: UpdatePermissionUseCase,
    private readonly deletePermissionUseCase: DeletePermissionUseCase,
    private readonly replaceRolePermissionsUseCase: ReplaceRolePermissionsUseCase,
  ) {}

  @ApiErrors([AppErrorCode.VALIDATION_ERROR, AppErrorCode.CONFLICT])
  @ResponseMessage('rbac.messages.role_created_success')
  @Post('roles')
  async createRole(@Body() dto: CreateRoleDto) {
    return this.createRoleUseCase.execute(dto as any);
  }

  @ResponseMessage('rbac.messages.roles_fetch_success')
  @Get('roles')
  async listRoles() {
    return this.listRolesUseCase.execute();
  }

  @ApiErrors([AppErrorCode.VALIDATION_ERROR, AppErrorCode.CONFLICT])
  @ResponseMessage('rbac.messages.permission_created_success')
  @Post('permissions')
  async createPermission(@Body() dto: CreatePermissionDto) {
    return this.createPermissionUseCase.execute(dto as any);
  }

  @ResponseMessage('rbac.messages.permissions_fetch_success')
  @Get('permissions')
  async listPermissions() {
    return this.listPermissionsUseCase.execute();
  }

  @ApiErrors([AppErrorCode.VALIDATION_ERROR, AppErrorCode.NOT_FOUND])
  @ResponseMessage('rbac.messages.permission_assigned_success')
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @Post('roles/:roleId/permissions')
  async assignPermission(
    @Param('roleId') roleId: string,
    @Body() dto: AssignPermissionDto,
  ) {
    await this.assignPermissionUseCase.execute({
      roleId,
      permissionId: dto.permissionId,
    });
    return { message: 'Permission assigned to role' };
  }

  @ApiErrors([AppErrorCode.NOT_FOUND])
  @ResponseMessage('rbac.messages.permission_removed_success')
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiParam({ name: 'permissionId', description: 'Permission ID' })
  @Delete('roles/:roleId/permissions/:permissionId')
  async removePermission(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
  ) {
    await this.removePermissionUseCase.execute({ roleId, permissionId });
    return { message: 'Permission removed from role' };
  }

  @ResponseMessage('rbac.messages.role_permissions_fetch_success')
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @Get('roles/:roleId/permissions')
  async listRolePermissions(@Param('roleId') roleId: string) {
    return this.getRolePermissionsUseCase.execute(roleId);
  }

  @ApiErrors([AppErrorCode.NOT_FOUND])
  @ResponseMessage('rbac.messages.role_fetch_success')
  @ApiParam({ name: 'id', description: 'Role ID' })
  @Get('roles/:id')
  async getRole(@Param('id') id: string) {
    return this.getRoleByIdUseCase.execute(id);
  }

  @ApiErrors([AppErrorCode.NOT_FOUND, AppErrorCode.CONFLICT])
  @ResponseMessage('rbac.messages.role_update_success')
  @ApiParam({ name: 'id', description: 'Role ID' })
  @Patch('roles/:id')
  async updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.updateRoleUseCase.execute(id, dto);
  }

  @ApiErrors([AppErrorCode.NOT_FOUND, AppErrorCode.CONFLICT])
  @ResponseMessage('rbac.messages.role_delete_success')
  @ApiParam({ name: 'id', description: 'Role ID' })
  @Delete('roles/:id')
  async deleteRole(@Param('id') id: string) {
    await this.deleteRoleUseCase.execute(id);
    return { message: 'Role deleted' };
  }

  @ApiErrors([AppErrorCode.NOT_FOUND])
  @ResponseMessage('rbac.messages.permission_fetch_success')
  @ApiParam({ name: 'id', description: 'Permission ID' })
  @Get('permissions/:id')
  async getPermission(@Param('id') id: string) {
    return this.getPermissionByIdUseCase.execute(id);
  }

  @ApiErrors([AppErrorCode.NOT_FOUND, AppErrorCode.CONFLICT])
  @ResponseMessage('rbac.messages.permission_update_success')
  @ApiParam({ name: 'id', description: 'Permission ID' })
  @Patch('permissions/:id')
  async updatePermission(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionDto,
  ) {
    return this.updatePermissionUseCase.execute(id, dto);
  }

  @ApiErrors([AppErrorCode.NOT_FOUND, AppErrorCode.CONFLICT])
  @ResponseMessage('rbac.messages.permission_delete_success')
  @ApiParam({ name: 'id', description: 'Permission ID' })
  @Delete('permissions/:id')
  async deletePermission(@Param('id') id: string) {
    await this.deletePermissionUseCase.execute(id);
    return { message: 'Permission deleted' };
  }

  @ApiErrors([AppErrorCode.NOT_FOUND])
  @ResponseMessage('rbac.messages.role_permissions_replaced_success')
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @Put('roles/:roleId/permissions')
  async replaceRolePermissions(
    @Param('roleId') roleId: string,
    @Body() dto: ReplaceRolePermissionsDto,
  ) {
    await this.replaceRolePermissionsUseCase.execute(roleId, dto.permissionIds);
    return { message: 'Role permissions replaced' };
  }
}
