/**
 * STAKD Internationalization Configuration
 *
 * Supported locales and default settings.
 * Add new languages by:
 * 1. Adding locale code here
 * 2. Creating translation files in /messages/{locale}/
 * 3. Adding glossary entries for collector terms
 */

export const locales = ["en", "es", "zh-CN", "ja"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
  "zh-CN": "简体中文",
  ja: "日本語",
};

/** RTL languages (none currently, but ready for Arabic/Hebrew) */
export const rtlLocales: Locale[] = [];

export function isRtl(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}

/**
 * Locale-specific formatting defaults.
 * Used by formatting utilities for currency, dates, distance.
 */
export const localeFormats: Record<
  Locale,
  {
    currency: string;
    dateStyle: "short" | "medium" | "long";
    distanceUnit: "mi" | "km";
    numberGrouping: string;
  }
> = {
  en: {
    currency: "USD",
    dateStyle: "medium",
    distanceUnit: "mi",
    numberGrouping: ",",
  },
  es: {
    currency: "USD",
    dateStyle: "medium",
    distanceUnit: "km",
    numberGrouping: ".",
  },
  "zh-CN": {
    currency: "CNY",
    dateStyle: "medium",
    distanceUnit: "km",
    numberGrouping: ",",
  },
  ja: {
    currency: "JPY",
    dateStyle: "medium",
    distanceUnit: "km",
    numberGrouping: ",",
  },
};
