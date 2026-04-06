"use client";

import { Globe } from "lucide-react";
import { useI18n, localeNames, type Locale, locales } from "@/i18n";

/**
 * Language switcher dropdown.
 * Updates app locale + persists to cookie.
 * Add to Navbar or Settings page.
 */
export default function LanguageSelector() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="relative group">
      <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] transition-colors">
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{localeNames[locale]}</span>
      </button>

      <div className="absolute right-0 top-full mt-1 py-1 min-w-[160px] rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)] shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        {locales.map((loc) => (
          <button
            key={loc}
            onClick={() => setLocale(loc as Locale)}
            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
              locale === loc
                ? "text-[var(--color-accent)] bg-[var(--color-accent-subtle)]"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]"
            }`}
          >
            {localeNames[loc as Locale]}
          </button>
        ))}
      </div>
    </div>
  );
}
