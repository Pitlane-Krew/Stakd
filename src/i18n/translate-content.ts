/**
 * On-Demand User Content Translation
 *
 * Translates user-generated content (posts, comments, descriptions)
 * via the Claude API with caching to minimize cost.
 *
 * Design decisions:
 * - NEVER auto-translate stored content
 * - Only translate on user request ("Translate post" button)
 * - Cache translations in Supabase to avoid repeat API calls
 * - Fall back gracefully if translation service is unavailable
 */

import { createClient } from "@/lib/supabase/client";
import type { Locale } from "./config";

interface TranslationResult {
  translatedText: string;
  cached: boolean;
}

/**
 * Translate user-generated content on demand.
 * Checks cache first, calls /api/translate if miss.
 *
 * @param text - Original text to translate
 * @param targetLocale - Locale to translate into
 * @param sourceLocale - Source locale (auto-detect if omitted)
 * @returns Translated text + cache status
 */
export async function translateContent(
  text: string,
  targetLocale: Locale,
  sourceLocale?: Locale
): Promise<TranslationResult> {
  // Don't translate if target = source
  if (sourceLocale && sourceLocale === targetLocale) {
    return { translatedText: text, cached: true };
  }

  // Short texts aren't worth translating
  if (text.trim().length < 3) {
    return { translatedText: text, cached: true };
  }

  // Check cache first
  const supabase = createClient();
  const { data: cached } = await supabase
    .from("translation_cache")
    .select("translated_text")
    .eq("original_hash", hashText(text))
    .eq("target_locale", targetLocale)
    .single();

  if (cached) {
    return { translatedText: cached.translated_text, cached: true };
  }

  // Call translation API
  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        targetLocale,
        sourceLocale,
      }),
    });

    if (!res.ok) throw new Error("Translation failed");

    const { translatedText } = await res.json();

    // Cache the result (fire and forget)
    supabase
      .from("translation_cache")
      .insert({
        original_hash: hashText(text),
        original_text: text.slice(0, 5000), // Limit stored text
        translated_text: translatedText,
        target_locale: targetLocale,
        source_locale: sourceLocale ?? "auto",
      })
      .then(() => {});

    return { translatedText, cached: false };
  } catch {
    return { translatedText: text, cached: false };
  }
}

/**
 * Simple string hash for cache lookups.
 * Using a basic hash to avoid storing full text in WHERE clause.
 */
function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `h_${Math.abs(hash).toString(36)}`;
}
