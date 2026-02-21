export const locales = ['en', 'pt'] as const;
export type AppLocale = (typeof locales)[number];

export function isValidLocale(value: string): value is AppLocale {
  return locales.includes(value as AppLocale);
}
