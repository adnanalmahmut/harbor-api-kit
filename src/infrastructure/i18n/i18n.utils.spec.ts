import { SUPPORTED_LOCALES } from '#src/config/index.js';
import { resolveSupportedLocale } from './i18n.utils.js';

describe('resolveSupportedLocale', () => {
  it.each(SUPPORTED_LOCALES)(
    'returns the canonical locale for exact supported tag %s',
    (locale) => {
      expect(resolveSupportedLocale(locale)).toBe(locale);
    },
  );

  it('maps language-only aliases to supported locales', () => {
    expect(resolveSupportedLocale('ar')).toBe('ar-SY');
    expect(resolveSupportedLocale('en')).toBe('en-US');
  });

  it('maps regional aliases to the canonical supported locale', () => {
    expect(resolveSupportedLocale('ar-EG')).toBe('ar-SY');
    expect(resolveSupportedLocale('en-GB')).toBe('en-US');
  });

  it('returns undefined for unsupported locales', () => {
    expect(resolveSupportedLocale('fr')).toBeUndefined();
    expect(resolveSupportedLocale(undefined)).toBeUndefined();
  });
});
