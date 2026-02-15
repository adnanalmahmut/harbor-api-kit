import { CONSTANTS_KEYS } from '#src/core/presentation/http/constants/metadata-keys.constants.js';
import { SetMetadata } from '@nestjs/common';

export const SkipEnvelope = () =>
  SetMetadata(CONSTANTS_KEYS.SKIP_ENVELOPE, true);
