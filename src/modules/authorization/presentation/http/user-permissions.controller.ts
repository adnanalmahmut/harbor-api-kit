import { ApiResponses, ResponseMessage } from '#src/core/index.js';
import { AuthGuard } from '#src/modules/auth/index.js';
import { AuthorizationException } from '../../application/exceptions/authorization.exception.js';
import { GetUserEffectivePermissionsUseCase } from '../../application/use-cases/get-user-effective-permissions.use-case.js';
import { GetUserPermissionsUseCase } from '../../application/use-cases/get-user-permissions.use-case.js';
import { RemoveUserPermissionOverrideUseCase } from '../../application/use-cases/remove-user-permission-override.use-case.js';
import { ReplaceUserPermissionsUseCase } from '../../application/use-cases/replace-user-permissions.use-case.js';
import { SetUserPermissionOverrideUseCase } from '../../application/use-cases/set-user-permission-override.use-case.js';
import { isPermissionKey } from '../../domain/permissions.catalog.js';
import { USER_PERMISSIONS_RESPONSES } from './api-responses.examples.js';
import { Permissions } from './decorators/permissions.decorator.js';
import { ReplaceUserPermissionsDto } from './dtos/replace-user-permissions.dto.js';
import { SetPermissionOverrideDto } from './dtos/set-permission-override.dto.js';
import { PermissionsGuard } from './guards/permissions.guard.js';
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

/**
 * Per-user permission overrides. The routes stay under `/users/:id` because
 * they address a user, but the concept — and therefore the ownership — belongs
 * to the authorization module. User identity itself is managed by Better Auth
 * under `/auth/admin/*`.
 */
@ApiTags('Authorization')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('users')
export class UserPermissionsController {
  constructor(
    private readonly getUserPermissionsUseCase: GetUserPermissionsUseCase,
    private readonly setUserPermissionOverrideUseCase: SetUserPermissionOverrideUseCase,
    private readonly removeUserPermissionOverrideUseCase: RemoveUserPermissionOverrideUseCase,
    private readonly replaceUserPermissionsUseCase: ReplaceUserPermissionsUseCase,
    private readonly getUserEffectivePermissionsUseCase: GetUserEffectivePermissionsUseCase,
  ) {}

  @ApiResponses(USER_PERMISSIONS_RESPONSES.getUserPermissions)
  @ResponseMessage('authorization.messages.user_permissions_fetch_success')
  @ApiParam({ name: 'id', description: 'User ID' })
  @Permissions(['user:set-permission'])
  @Get(':id/permissions')
  async getUserPermissions(@Param('id') userId: string) {
    return this.getUserPermissionsUseCase.execute(userId);
  }

  @ApiResponses(USER_PERMISSIONS_RESPONSES.setPermissionOverride)
  @ResponseMessage('authorization.messages.permission_override_set_success')
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

  @ApiResponses(USER_PERMISSIONS_RESPONSES.removePermissionOverride)
  @ResponseMessage('authorization.messages.permission_override_removed_success')
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiParam({ name: 'permissionKey', description: 'Permission key' })
  @Permissions(['user:set-permission'])
  @Delete(':id/permissions/:permissionKey')
  async removePermissionOverride(
    @Param('id') userId: string,
    @Param('permissionKey') permissionKey: string,
  ) {
    if (!isPermissionKey(permissionKey)) {
      throw AuthorizationException.permissionOverrideNotFound(permissionKey);
    }
    await this.removeUserPermissionOverrideUseCase.execute({
      userId,
      permissionKey,
    });
  }

  @ApiResponses(USER_PERMISSIONS_RESPONSES.replaceUserPermissions)
  @ResponseMessage('authorization.messages.user_permissions_replaced_success')
  @ApiParam({ name: 'id', description: 'User ID' })
  @Permissions(['user:set-permission'])
  @Put(':id/permissions')
  async replaceUserPermissions(
    @Param('id') userId: string,
    @Body() body: ReplaceUserPermissionsDto,
  ) {
    await this.replaceUserPermissionsUseCase.execute(userId, body.overrides);
  }

  @ApiResponses(USER_PERMISSIONS_RESPONSES.getEffectivePermissions)
  @ResponseMessage(
    'authorization.messages.user_effective_permissions_fetch_success',
  )
  @ApiParam({ name: 'id', description: 'User ID' })
  @Permissions(['user:set-permission'])
  @Get(':id/effective-permissions')
  async getUserEffectivePermissions(@Param('id') userId: string) {
    return this.getUserEffectivePermissionsUseCase.execute(userId);
  }
}
