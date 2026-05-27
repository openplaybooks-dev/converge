type TranslateFn = (key: string, _params?: Record<string, string | number>) => string;

const t: TranslateFn = (key) => key;

export function useI18n() {
  return { t, locale: 'en' as Locale, setLocale: (_l: Locale) => {} };
}

export function useT(): TranslateFn {
  return t;
}

export type Locale = 'en';
export const LOCALES: Locale[] = ['en'];
export const LOCALE_LABEL: Record<Locale, string> = { en: 'English' };
