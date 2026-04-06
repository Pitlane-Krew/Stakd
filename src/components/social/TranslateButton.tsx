"use client";

import { useState } from "react";
import { Languages } from "lucide-react";
import { useI18n, useNamespaces } from "@/i18n";
import { translateContent } from "@/i18n/translate-content";

interface Props {
  text: string;
  onTranslated?: (translatedText: string) => void;
}

/**
 * "Translate" button for user-generated content.
 * Shows translated text inline, with a "Show original" toggle.
 */
export default function TranslateButton({ text, onTranslated }: Props) {
  const { locale, t } = useI18n();
  useNamespaces("social");

  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  async function handleTranslate() {
    if (translated) {
      setShowOriginal(!showOriginal);
      return;
    }

    setLoading(true);
    try {
      const result = await translateContent(text, locale);
      setTranslated(result.translatedText);
      onTranslated?.(result.translatedText);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleTranslate}
        disabled={loading}
        className="flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline transition-colors disabled:opacity-50"
      >
        <Languages className="w-3 h-3" />
        {loading
          ? t("social.translating")
          : translated
            ? showOriginal
              ? t("social.translate_post")
              : t("social.show_original")
            : t("social.translate_post")}
      </button>

      {translated && !showOriginal && (
        <p className="mt-1 text-sm text-[var(--color-text-secondary)] italic border-l-2 border-[var(--color-accent)] pl-2">
          {translated}
        </p>
      )}
    </div>
  );
}
