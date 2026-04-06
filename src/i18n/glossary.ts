/**
 * STAKD Collector Terminology Glossary System
 *
 * This module provides bidirectional mapping between:
 * - Internal canonical values (English, stored in DB)
 * - Localized display labels per language
 *
 * Internal DB values are ALWAYS stored in English.
 * The glossary translates for display only.
 *
 * To add a new term:
 * 1. Add the canonical key to CollectorTerm type
 * 2. Add English label to GLOSSARY_ENTRIES
 * 3. Add translations to each locale's glossary.json
 */

import type { Locale } from "./config";

/**
 * All recognized collector terms.
 * Canonical values stored in DB / used in filters & logic.
 */
export type CollectorTerm =
  | "graded"
  | "raw"
  | "sealed"
  | "booster_box"
  | "treasure_hunt"
  | "super_treasure_hunt"
  | "vaulted"
  | "chase"
  | "slabbed"
  | "first_edition"
  | "holographic"
  | "mint"
  | "near_mint"
  | "excellent"
  | "good"
  | "poor"
  | "psa"
  | "bgs"
  | "cgc"
  | "secret_rare"
  | "ultra_rare"
  | "common"
  | "uncommon"
  | "rare";

/** Grouping of terms by context (conditions, grades, rarities, etc.) */
export type TermGroup =
  | "condition"
  | "grading_company"
  | "rarity"
  | "special";

interface GlossaryEntry {
  canonical: CollectorTerm;
  group: TermGroup;
  description: string; // Internal documentation
}

/**
 * Master glossary registry. Defines all collector terms
 * with their group and description.
 */
export const GLOSSARY_ENTRIES: GlossaryEntry[] = [
  // Conditions
  { canonical: "graded", group: "condition", description: "Professionally graded by a grading company" },
  { canonical: "raw", group: "condition", description: "Ungraded, not in a slab" },
  { canonical: "sealed", group: "condition", description: "Factory sealed, never opened" },
  { canonical: "slabbed", group: "condition", description: "Encased in a grading company slab" },
  { canonical: "mint", group: "condition", description: "Perfect condition" },
  { canonical: "near_mint", group: "condition", description: "Almost perfect, very minor wear" },
  { canonical: "excellent", group: "condition", description: "Light wear, no major damage" },
  { canonical: "good", group: "condition", description: "Noticeable wear, still presentable" },
  { canonical: "poor", group: "condition", description: "Heavy wear or damage" },

  // Grading companies
  { canonical: "psa", group: "grading_company", description: "Professional Sports Authenticator" },
  { canonical: "bgs", group: "grading_company", description: "Beckett Grading Services" },
  { canonical: "cgc", group: "grading_company", description: "Certified Guaranty Company" },

  // Rarities
  { canonical: "common", group: "rarity", description: "Common rarity level" },
  { canonical: "uncommon", group: "rarity", description: "Uncommon rarity level" },
  { canonical: "rare", group: "rarity", description: "Rare rarity level" },
  { canonical: "ultra_rare", group: "rarity", description: "Ultra rare, highly sought after" },
  { canonical: "secret_rare", group: "rarity", description: "Secret rare, hardest to find" },

  // Special designations
  { canonical: "first_edition", group: "special", description: "First print run of a product" },
  { canonical: "holographic", group: "special", description: "Card with holographic surface" },
  { canonical: "booster_box", group: "special", description: "Sealed box of booster packs" },
  { canonical: "treasure_hunt", group: "special", description: "Hot Wheels limited chase variant" },
  { canonical: "super_treasure_hunt", group: "special", description: "Hot Wheels ultra-limited chase variant" },
  { canonical: "vaulted", group: "special", description: "Funko Pop retired from production" },
  { canonical: "chase", group: "special", description: "Limited variant of a standard release" },
];

/** Translation cache to avoid re-importing on every call */
const translationCache = new Map<Locale, Record<string, string>>();

/**
 * Load glossary translations for a locale.
 * Uses dynamic import for lazy loading.
 */
async function loadGlossaryTranslations(
  locale: Locale
): Promise<Record<string, string>> {
  if (translationCache.has(locale)) {
    return translationCache.get(locale)!;
  }

  try {
    const translations = await import(`../../../messages/${locale}/glossary.json`);
    const data = translations.default ?? translations;
    translationCache.set(locale, data);
    return data;
  } catch {
    // Fall back to English
    const en = await import("../../../messages/en/glossary.json");
    const data = en.default ?? en;
    translationCache.set(locale, data);
    return data;
  }
}

/**
 * Get the localized display label for a collector term.
 *
 * @param term - Canonical English term (stored in DB)
 * @param locale - Target display locale
 * @returns Translated label (falls back to English capitalized)
 */
export async function getTermLabel(
  term: CollectorTerm,
  locale: Locale
): Promise<string> {
  const translations = await loadGlossaryTranslations(locale);
  return translations[term] ?? term.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Get all terms for a given group, with translations.
 *
 * @param group - Term group (condition, grading_company, rarity, special)
 * @param locale - Target display locale
 * @returns Array of { value, label } for use in select dropdowns etc.
 */
export async function getTermsByGroup(
  group: TermGroup,
  locale: Locale
): Promise<Array<{ value: CollectorTerm; label: string }>> {
  const translations = await loadGlossaryTranslations(locale);
  return GLOSSARY_ENTRIES.filter((e) => e.group === group).map((e) => ({
    value: e.canonical,
    label:
      translations[e.canonical] ??
      e.canonical.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  }));
}

/**
 * Synchronous version for use in components that have already loaded translations.
 * Requires the glossary JSON to be preloaded.
 */
export function getTermLabelSync(
  term: string,
  glossary: Record<string, string>
): string {
  return glossary[term] ?? term.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
