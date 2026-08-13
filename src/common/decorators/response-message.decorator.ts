import { SetMetadata } from '@nestjs/common';
import { CONSTANTS_KEYS } from '../constants/metadata-keys.constants.js';

export function ResponseMessage(message: string) {
  return SetMetadata(CONSTANTS_KEYS.RESPONSE_MESSAGE, message);
}
