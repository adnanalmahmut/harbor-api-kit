import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard.js';

export function RequiredAuth() {
  return applyDecorators(UseGuards(AuthGuard));
}
