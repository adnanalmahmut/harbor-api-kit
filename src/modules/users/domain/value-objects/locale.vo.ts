import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from '#src/core/constants/locales.js';
import { AppException } from '#src/core/exceptions/app-exception.js';

export class LocaleVO {
  private constructor(readonly value: SupportedLocale) {}
  static create(locale?: string): LocaleVO {
    const value = (locale?.trim() || DEFAULT_LOCALE) as SupportedLocale;
    if (!SUPPORTED_LOCALES.includes(value)) {
      throw AppException.validationError({ field: 'locale' });
    }
    return new LocaleVO(value);
  }
}
