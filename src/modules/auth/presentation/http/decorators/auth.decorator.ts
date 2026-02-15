import { AuthGuard } from '#src/modules/auth/presentation/http/guards/auth.guard.js';
import { applyDecorators, UseGuards } from '@nestjs/common';

export function RequiredAuth() {
  return applyDecorators(UseGuards(AuthGuard));
}
