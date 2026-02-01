import { CONSTANTS_KEYS } from '#src/core/http/metadata-keys.constants.js';
import { SetMetadata } from '@nestjs/common';

export function ResponseMessage(message: string) {
  return SetMetadata(CONSTANTS_KEYS.RESPONSE_MESSAGE, message);
}
