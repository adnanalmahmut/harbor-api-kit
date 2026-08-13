import { ApiResponses } from '#src/common/api-errors.decorator.js';
import { ResponseMessage } from '#src/common/response.interceptor.js';
import { AuthGuard } from '#src/modules/auth/auth.guard.js';
import { AuthorizationException } from './authorization.exception.js';
import { AuthorizationService } from './authorization.service.js';
import { Permissions } from './decorators/permissions.decorator.js';
import { USER_PERMISSIONS_RESPONSES } from './dto/api-responses.examples.js';
import { ReplaceUserPermissionsDto } from './dto/replace-user-permissions.dto.js';
import { SetPermissionOverrideDto } from './dto/set-permission-override.dto.js';
import { PermissionsGuard } from './guards/permissions.guard.js';
import { isPermissionKey } from './permissions.catalog.js';
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
export class AuthorizationController {
  constructor(private readonly authorizationService: AuthorizationService) {}

  @ApiResponses(USER_PERMISSIONS_RESPONSES.getUserPermissions)
  @ResponseMessage('authorization.messages.user_permissions_fetch_success')
  @ApiParam({ name: 'id', description: 'User ID' })
  @Permissions(['user:set-permission'])
  @Get(':id/permissions')
  async getUserPermissions(@Param('id') userId: string) {
    return this.authorizationService.listOverrides(userId);
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
    await this.authorizationService.setOverride({
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
    await this.authorizationService.removeOverride({
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
    await this.authorizationService.replaceOverrides(userId, body.overrides);
  }

  @ApiResponses(USER_PERMISSIONS_RESPONSES.getEffectivePermissions)
  @ResponseMessage(
    'authorization.messages.user_effective_permissions_fetch_success',
  )
  @ApiParam({ name: 'id', description: 'User ID' })
  @Permissions(['user:set-permission'])
  @Get(':id/effective-permissions')
  async getUserEffectivePermissions(@Param('id') userId: string) {
    return this.authorizationService.getEffectivePermissions(userId);
  }
}
