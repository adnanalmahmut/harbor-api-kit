import { AppConfigService } from '#src/core/infrastructure/config/app-config.service.js';
import { AuthConfigPort } from '#src/modules/auth/domain/ports/auth-config.port.js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthConfigAdapter implements AuthConfigPort {
  constructor(private readonly config: AppConfigService) {}

  get sessionTokenCookie(): string {
    return this.config.auth().sessionTokenCookie;
  }
}
