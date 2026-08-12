import { ApiResponses, ResponseMessage } from '#src/core/index.js';
import { AuthGuard } from '#src/modules/auth/index.js';
import {
  Permissions,
  PermissionsGuard,
  isPermissionKey,
} from '#src/modules/authorization/index.js';
import { UsersException } from '../../application/exceptions/users.exception.js';
import { UserResponseMapper } from '../../application/mappers/user-response.mapper.js';
import { CreateUserUseCase } from '../../application/use-cases/create-user.use-case.js';
import { GetAllUsersUseCase } from '../../application/use-cases/get-all-users.use-case.js';
import { GetUserEffectivePermissionsUseCase } from '../../application/use-cases/get-user-effective-permissions.use-case.js';
import { GetUserPermissionsUseCase } from '../../application/use-cases/get-user-permissions.use-case.js';
import { GetUserByIdUseCase } from '../../application/use-cases/get-user-by-id.use-case.js';
import { RemoveUserPermissionOverrideUseCase } from '../../application/use-cases/remove-user-permission-override.use-case.js';
import { ReplaceUserPermissionsUseCase } from '../../application/use-cases/replace-user-permissions.use-case.js';
import { SetUserPermissionOverrideUseCase } from '../../application/use-cases/set-user-permission-override.use-case.js';
import { UpdateUserByIdUseCase } from '../../application/use-cases/update-user-by-id.use-case.js';
import { USERS_RESPONSES } from './api-responses.examples.js';
import { CreateUserDto } from './dtos/create-user.dto.js';
import { ReplaceUserPermissionsDto } from './dtos/replace-user-permissions.dto.js';
import { SetPermissionOverrideDto } from './dtos/set-permission-override.dto.js';
import { UpdateUserAdminDto } from './dtos/update-user-admin.dto.js';
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

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    private readonly getAllUsersUseCase: GetAllUsersUseCase,
    private readonly setUserPermissionOverrideUseCase: SetUserPermissionOverrideUseCase,
    private readonly removeUserPermissionOverrideUseCase: RemoveUserPermissionOverrideUseCase,
    private readonly updateUserByIdUseCase: UpdateUserByIdUseCase,
    private readonly getUserPermissionsUseCase: GetUserPermissionsUseCase,
    private readonly replaceUserPermissionsUseCase: ReplaceUserPermissionsUseCase,
    private readonly getUserEffectivePermissionsUseCase: GetUserEffectivePermissionsUseCase,
  ) {}

  @ApiResponses(USERS_RESPONSES.findAll)
  @ResponseMessage('users.messages.users_fetch_success')
  @Permissions(['user:list'])
  @Get()
  async findAll() {
    return this.getAllUsersUseCase.execute();
  }

  @ApiResponses(USERS_RESPONSES.create)
  @ResponseMessage('users.messages.user_created_success')
  @Permissions(['user:create'])
  @Post()
  async create(@Body() body: CreateUserDto) {
    const user = await this.createUserUseCase.execute({
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      locale: body.locale,
    });
    return UserResponseMapper.map(user);
  }

  @ApiResponses(USERS_RESPONSES.findById)
  @ResponseMessage('users.messages.user_fetch_success')
  @ApiParam({ name: 'id', description: 'User ID' })
  @Permissions(['user:get'])
  @Get(':id')
  async findById(@Param('id') id: string) {
    const user = await this.getUserByIdUseCase.execute(id);
    if (!user) throw UsersException.userNotFound(id);
    return UserResponseMapper.map(user);
  }

  @ApiResponses(USERS_RESPONSES.setPermissionOverride)
  @ResponseMessage('users.messages.permission_override_set_success')
  @ApiParam({ name: 'id', description: 'User ID' })
  @Permissions(['user:set-permission'])
  @Post(':id/permissions')
  async setPermissionOverride(
    @Param('id') userId: string,
    @Body() body: SetPermissionOverrideDto,
  ) {
    await this.setUserPermissionOverrideUseCase.execute({
      userId,
      permissionKey: body.permissionKey,
      effect: body.effect,
      note: body.note,
    });
  }

  @ApiResponses(USERS_RESPONSES.removePermissionOverride)
  @ResponseMessage('users.messages.permission_override_removed_success')
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiParam({ name: 'permissionKey', description: 'Permission key' })
  @Permissions(['user:set-permission'])
  @Delete(':id/permissions/:permissionKey')
  async removePermissionOverride(
    @Param('id') userId: string,
    @Param('permissionKey') permissionKey: string,
  ) {
    if (!isPermissionKey(permissionKey)) {
      throw UsersException.permissionOverrideNotFound(permissionKey);
    }
    await this.removeUserPermissionOverrideUseCase.execute({
      userId,
      permissionKey,
    });
  }

  @ApiResponses(USERS_RESPONSES.update)
  @ResponseMessage('users.messages.user_updated_success')
  @ApiParam({ name: 'id', description: 'User ID' })
  @Permissions(['user:update'])
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

  @ApiResponses(USERS_RESPONSES.getUserPermissions)
  @ResponseMessage('users.messages.user_permissions_fetch_success')
  @ApiParam({ name: 'id', description: 'User ID' })
  @Permissions(['user:set-permission'])
  @Get(':id/permissions')
  async getUserPermissions(@Param('id') userId: string) {
    return this.getUserPermissionsUseCase.execute(userId);
  }

  @ApiResponses(USERS_RESPONSES.replaceUserPermissions)
  @ResponseMessage('users.messages.user_permissions_replaced_success')
  @ApiParam({ name: 'id', description: 'User ID' })
  @Permissions(['user:set-permission'])
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
  @Permissions(['user:set-permission'])
  @Get(':id/effective-permissions')
  async getUserEffectivePermissions(@Param('id') userId: string) {
    return this.getUserEffectivePermissionsUseCase.execute(userId);
  }
}
