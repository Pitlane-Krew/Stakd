/**
 * STAKD i18n - Public API
 *
 * Usage:
 *   import { useI18n, useNamespaces, I18nProvider } from "@/i18n";
 *
 *   // In root layout:
 *   <I18nProvider namespaces={["common"]}>
 *     {children}
 *   </I18nProvider>
 *
 *   // In any component:
 *   const { t, locale, formatCurrency } = useI18n();
 *   useNamespaces("collections", "items");
 *   <h1>{t("common.nav.dashboard")}</h1>
 */

export { I18nProvider, useI18n, useNamespaces } from "./provider";
export { locales, defaultLocale, localeNames, localeFormats, isRtl } from "./config";
export type { Locale } from "./config";
export type { TranslationNamespace, Messages } from "./types";
export {
  getTermLabel,
  getTermsByGroup,
  getTermLabelSync,
  GLOSSARY_ENTRIES,
} from "./glossary";
export type { CollectorTerm, TermGroup } from "./glossary";
