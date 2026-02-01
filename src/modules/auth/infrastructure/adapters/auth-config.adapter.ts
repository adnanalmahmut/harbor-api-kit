import { AuthConfigPort } from '#src/modules/auth/application/ports/auth-config.port.js';
import { AppConfigService } from '#src/shared/config/app-config.service.js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthConfigAdapter implements AuthConfigPort {
  constructor(private readonly config: AppConfigService) {}

  get sessionTokenCookie(): string {
    return this.config.auth().sessionTokenCookie;
  }
}
