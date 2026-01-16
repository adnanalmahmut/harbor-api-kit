import { SetMetadata } from '@nestjs/common';
import { CONSTANTS_KEYS } from './metadata-keys.constants.js';

export const SkipEnvelope = () =>
  SetMetadata(CONSTANTS_KEYS.SKIP_ENVELOPE, true);
