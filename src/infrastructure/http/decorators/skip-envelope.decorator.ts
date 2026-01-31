import { CONSTANTS_KEYS } from '#src/core/http/metadata-keys.constants.js';
import { SetMetadata } from '@nestjs/common';

export const SkipEnvelope = () =>
  SetMetadata(CONSTANTS_KEYS.SKIP_ENVELOPE, true);
