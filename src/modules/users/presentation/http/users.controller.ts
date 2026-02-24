import { ApiResponses, ResponseMessage } from '#src/core/index.js';
import { AuthGuard } from '#src/modules/auth/presentation/http/auth.guard.js';
import { Roles } from '#src/modules/rbac/presentation/http/decorators/roles.decorator.js';
import { RbacGuard } from '#src/modules/rbac/presentation/http/guards/rbac.guard.js';
import { UsersException } from '#src/modules/users/application/exceptions/users.exception.js';
import { AddRoleToUserUseCase } from '#src/modules/users/application/use-cases/add-role-to-user.use-case.js';
import { CreateUserUseCase } from '#src/modules/users/application/use-cases/create-user.use-case.js';
import { GetAllUserUseCase } from '#src/modules/users/application/use-cases/get-all-users.use-case.js';
import { GetUserEffectivePermissionsUseCase } from '#src/modules/users/application/use-cases/get-user-effective-permissions.use-case.js';
import { GetUserPermissionsUseCase } from '#src/modules/users/application/use-cases/get-user-permissions.use-case.js';
import { GetUserRolesUseCase } from '#src/modules/users/application/use-cases/get-user-roles.use-case.js';
import { GetUserByIdUseCase } from '#src/modules/users/application/use-cases/get-users.use-case.js';
import { RemoveRoleFromUserUseCase } from '#src/modules/users/application/use-cases/remove-role-from-user.use-case.js';
import { RemoveUserPermissionOverrideUseCase } from '#src/modules/users/application/use-cases/remove-user-permission-override.use-case.js';
import { ReplaceUserPermissionsUseCase } from '#src/modules/users/application/use-cases/replace-user-permissions.use-case.js';
import { ReplaceUserRolesUseCase } from '#src/modules/users/application/use-cases/replace-user-roles.use-case.js';
import { SetUserPermissionOverrideUseCase } from '#src/modules/users/application/use-cases/set-user-permission-override.use-case.js';
import { UpdateUserByIdUseCase } from '#src/modules/users/application/use-cases/update-user-by-id.use-case.js';
import { AddRoleToUserDto } from '#src/modules/users/presentation/http/dtos/add-role-to-user.dto.js';
import { CreateUserDto } from '#src/modules/users/presentation/http/dtos/create-user.dto.js';
import { ReplaceUserPermissionsDto } from '#src/modules/users/presentation/http/dtos/replace-user-permissions.dto.js';
import { ReplaceUserRolesDto } from '#src/modules/users/presentation/http/dtos/replace-user-roles.dto.js';
import { SetPermissionOverrideDto } from '#src/modules/users/presentation/http/dtos/set-permission-override.dto.js';
import { UpdateUserAdminDto } from '#src/modules/users/presentation/http/dtos/update-user-admin.dto.js';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { UserResponseMapper } from '../../application/mappers/user-response.mapper.js';

import { Permissions } from '#src/modules/rbac/presentation/http/decorators/permissions.decorator.js';
import { USERS_RESPONSES } from './api-responses.examples.js';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard, RbacGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    private readonly getAllUserUseCase: GetAllUserUseCase,
    private readonly addRoleToUserUseCase: AddRoleToUserUseCase,
    private readonly removeRoleFromUserUseCase: RemoveRoleFromUserUseCase,
    private readonly setUserPermissionOverrideUseCase: SetUserPermissionOverrideUseCase,
    private readonly removeUserPermissionOverrideUseCase: RemoveUserPermissionOverrideUseCase,
    private readonly updateUserByIdUseCase: UpdateUserByIdUseCase,
    private readonly getUserRolesUseCase: GetUserRolesUseCase,
    private readonly replaceUserRolesUseCase: ReplaceUserRolesUseCase,
    private readonly getUserPermissionsUseCase: GetUserPermissionsUseCase,
    private readonly replaceUserPermissionsUseCase: ReplaceUserPermissionsUseCase,
    private readonly getUserEffectivePermissionsUseCase: GetUserEffectivePermissionsUseCase,
  ) {}

  @ApiResponses(USERS_RESPONSES.findAll)
  @ResponseMessage('users.messages.users_fetch_success')
  @Permissions(['users:read'])
  @Get()
  async findAll() {
    return this.getAllUserUseCase.execute();
  }

  @ApiResponses(USERS_RESPONSES.create)
  @ResponseMessage('users.messages.user_created_success')
  @Permissions(['users:create'])
  @Post()
  async create(@Body() body: CreateUserDto) {
    const user = await this.createUserUseCase.execute({
      email: body.email,
      name: body.name,
      firstName: body.firstName,
      lastName: body.lastName,
      locale: body.locale,
    });
    return UserResponseMapper.map(user);
  }

  @ApiResponses(USERS_RESPONSES.findById)
  @ResponseMessage('users.messages.user_fetch_success')
  @ApiParam({ name: 'id', description: 'User ID' })
  @Permissions(['users:read'])
  @Get(':id')
  async findById(@Param('id') id: string) {
    const user = await this.getUserByIdUseCase.execute(id);
    if (!user) throw UsersException.userNotFound(id);
    return UserResponseMapper.map(user);
  }

  @ApiResponses(USERS_RESPONSES.addRoleToUser)
  @ResponseMessage('users.messages.role_added_success')
  @ApiParam({ name: 'id', description: 'User ID' })
  @UseGuards(AuthGuard, RbacGuard)
  @Roles(['admin'])
  @Post(':id/roles')
  async addRole(@Param('id') userId: string, @Body() body: AddRoleToUserDto) {
    await this.addRoleToUserUseCase.execute({ userId, roleId: body.roleId });
  }

  @ApiResponses(USERS_RESPONSES.removeRoleFromUser)
  @ResponseMessage('users.messages.role_removed_success')
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @UseGuards(AuthGuard, RbacGuard)
  @Roles(['admin'])
  @Delete(':id/roles/:roleId')
  async removeRole(
    @Param('id') userId: string,
    @Param('roleId') roleId: string,
  ) {
    await this.removeRoleFromUserUseCase.execute({ userId, roleId });
  }

  @ApiResponses(USERS_RESPONSES.setPermissionOverride)
  @ResponseMessage('users.messages.permission_override_set_success')
  @ApiParam({ name: 'id', description: 'User ID' })
  @UseGuards(AuthGuard, RbacGuard)
  @Roles(['admin'])
  @Post(':id/permissions')
  async setPermissionOverride(
    @Param('id') userId: string,
    @Body() body: SetPermissionOverrideDto,
  ) {
    await this.setUserPermissionOverrideUseCase.execute({
      userId,
      permissionId: body.permissionId,
      effect: body.effect,
    });
  }

  @ApiResponses(USERS_RESPONSES.removePermissionOverride)
  @ResponseMessage('users.messages.permission_override_removed_success')
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiParam({ name: 'permissionId', description: 'Permission ID' })
  @UseGuards(AuthGuard, RbacGuard)
  @Roles(['admin'])
  @Delete(':id/permissions/:permissionId')
  async removePermissionOverride(
    @Param('id') userId: string,
    @Param('permissionId') permissionId: string,
  ) {
    await this.removeUserPermissionOverrideUseCase.execute({
      userId,
      permissionId,
    });
  }

  @ApiResponses(USERS_RESPONSES.update)
  @ResponseMessage('users.messages.user_updated_success')
  @ApiParam({ name: 'id', description: 'User ID' })
  @UseGuards(AuthGuard, RbacGuard)
  @Roles(['admin'])
  @Put(':id')
  async updateUserAdmin(
    @Param('id') userId: string,
    @Body() body: UpdateUserAdminDto,
  ) {
    const user = await this.updateUserByIdUseCase.execute({
      userId,
      ...body,
    });
    return UserResponseMapper.map(user);
  }

  @ApiResponses(USERS_RESPONSES.getUserRoles)
  @ResponseMessage('users.messages.user_roles_fetch_success')
  @ApiParam({ name: 'id', description: 'User ID' })
  @UseGuards(AuthGuard, RbacGuard)
  @Roles(['admin'])
  @Get(':id/roles')
  async getUserRoles(@Param('id') userId: string) {
    return this.getUserRolesUseCase.execute(userId);
  }

  @ApiResponses(USERS_RESPONSES.replaceUserRoles)
  @ResponseMessage('users.messages.user_roles_replaced_success')
  @ApiParam({ name: 'id', description: 'User ID' })
  @UseGuards(AuthGuard, RbacGuard)
  @Roles(['admin'])
  @Put(':id/roles')
  async replaceUserRoles(
    @Param('id') userId: string,
    @Body() body: ReplaceUserRolesDto,
  ) {
    await this.replaceUserRolesUseCase.execute(userId, body.roleIds);
  }

  @ApiResponses(USERS_RESPONSES.getUserPermissions)
  @ResponseMessage('users.messages.user_permissions_fetch_success')
  @ApiParam({ name: 'id', description: 'User ID' })
  @UseGuards(AuthGuard, RbacGuard)
  @Roles(['admin'])
  @Get(':id/permissions')
  async getUserPermissions(@Param('id') userId: string) {
    return this.getUserPermissionsUseCase.execute(userId);
  }

  @ApiResponses(USERS_RESPONSES.replaceUserPermissions)
  @ResponseMessage('users.messages.user_permissions_replaced_success')
  @ApiParam({ name: 'id', description: 'User ID' })
  @UseGuards(AuthGuard, RbacGuard)
  @Roles(['admin'])
  @Put(':id/permissions')
  async replaceUserPermissions(
    @Param('id') userId: string,
    @Body() body: ReplaceUserPermissionsDto,
  ) {
    await this.replaceUserPermissionsUseCase.execute(userId, body.overrides);
  }

  @ApiResponses(USERS_RESPONSES.getEffectivePermissions)
  @ResponseMessage('users.messages.user_effective_permissions_fetch_success')
  @ApiParam({ name: 'id', description: 'User ID' })
  @UseGuards(AuthGuard, RbacGuard)
  @Roles(['admin'])
  @Get(':id/effective-permissions')
  async getUserEffectivePermissions(@Param('id') userId: string) {
    return this.getUserEffectivePermissionsUseCase.execute(userId);
  }
}
