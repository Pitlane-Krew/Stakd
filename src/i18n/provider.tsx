"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { type Locale, defaultLocale, locales, localeFormats } from "./config";
import type { TranslationNamespace } from "./types";

// -------------------------------------------------------------------
// Translation loading
// -------------------------------------------------------------------

type NestedRecord = { [key: string]: string | NestedRecord };

const messageCache = new Map<string, NestedRecord>();

async function loadNamespace(
  locale: Locale,
  ns: TranslationNamespace
): Promise<NestedRecord> {
  const cacheKey = `${locale}:${ns}`;
  if (messageCache.has(cacheKey)) return messageCache.get(cacheKey)!;

  try {
    const mod = await import(`../../../messages/${locale}/${ns}.json`);
    const data = mod.default ?? mod;
    messageCache.set(cacheKey, data);
    return data;
  } catch {
    // Fallback to English
    if (locale !== "en") {
      return loadNamespace("en", ns);
    }
    return {};
  }
}

// -------------------------------------------------------------------
// String interpolation
// -------------------------------------------------------------------

function interpolate(
  template: string,
  vars?: Record<string, string | number>
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`
  );
}

function getNestedValue(obj: NestedRecord, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object")
      return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

// -------------------------------------------------------------------
// Context
// -------------------------------------------------------------------

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  loadedNamespaces: Set<TranslationNamespace>;
  loadNamespaces: (...ns: TranslationNamespace[]) => Promise<void>;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string | Date) => string;
  formatDistance: (meters: number) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// -------------------------------------------------------------------
// Provider
// -------------------------------------------------------------------

interface Props {
  children: ReactNode;
  initialLocale?: Locale;
  /** Namespaces to preload on mount */
  namespaces?: TranslationNamespace[];
}

export function I18nProvider({
  children,
  initialLocale,
  namespaces = ["common"],
}: Props) {
  const [locale, setLocaleState] = useState<Locale>(
    initialLocale ?? detectBrowserLocale()
  );
  const [messages, setMessages] = useState<NestedRecord>({});
  const [loadedNs, setLoadedNs] = useState<Set<TranslationNamespace>>(
    new Set()
  );

  // Load initial namespaces
  useEffect(() => {
    loadNamespacesForLocale(locale, namespaces);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  async function loadNamespacesForLocale(
    loc: Locale,
    nsList: TranslationNamespace[]
  ) {
    const results: NestedRecord = {};
    for (const ns of nsList) {
      const data = await loadNamespace(loc, ns);
      results[ns] = data;
    }
    setMessages((prev) => ({ ...prev, ...results }));
    setLoadedNs((prev) => {
      const next = new Set(prev);
      nsList.forEach((ns) => next.add(ns));
      return next;
    });
  }

  const setLocale = useCallback(
    (newLocale: Locale) => {
      if (!locales.includes(newLocale)) return;
      setLocaleState(newLocale);
      // Persist preference
      if (typeof document !== "undefined") {
        document.cookie = `STAKD_LOCALE=${newLocale};path=/;max-age=31536000`;
      }
      document.documentElement.lang = newLocale;
    },
    []
  );

  const loadNs = useCallback(
    async (...ns: TranslationNamespace[]) => {
      await loadNamespacesForLocale(locale, ns);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale]
  );

  // Translation function: t("namespace.key.path", { vars })
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const [ns, ...rest] = key.split(".");
      const nsMessages = messages[ns];
      if (!nsMessages || typeof nsMessages !== "object") return key;

      const path = rest.join(".");
      const value = getNestedValue(nsMessages as NestedRecord, path);
      if (value === undefined) return key;

      return interpolate(value, vars);
    },
    [messages]
  );

  // Locale-aware formatting
  const fmt = localeFormats[locale];

  const formatCurrency = useCallback(
    (amount: number): string => {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: fmt.currency,
        minimumFractionDigits: fmt.currency === "JPY" ? 0 : 2,
      }).format(amount);
    },
    [locale, fmt.currency]
  );

  const formatDate = useCallback(
    (date: string | Date): string => {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: fmt.dateStyle,
      }).format(new Date(date));
    },
    [locale, fmt.dateStyle]
  );

  const formatDistance = useCallback(
    (meters: number): string => {
      if (fmt.distanceUnit === "mi") {
        const miles = meters / 1609.34;
        return `${miles.toFixed(1)} mi`;
      }
      const km = meters / 1000;
      return `${km.toFixed(1)} km`;
    },
    [fmt.distanceUnit]
  );

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t,
        loadedNamespaces: loadedNs,
        loadNamespaces: loadNs,
        formatCurrency,
        formatDate,
        formatDistance,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

// -------------------------------------------------------------------
// Hook
// -------------------------------------------------------------------

/**
 * Access translation function and locale utilities.
 *
 * @example
 * const { t, locale, formatCurrency } = useI18n();
 * <h1>{t("common.nav.dashboard")}</h1>
 * <span>{formatCurrency(item.estimated_value)}</span>
 */
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within <I18nProvider>");
  }
  return ctx;
}

/**
 * Hook to lazily load additional translation namespaces.
 *
 * @example
 * useNamespaces("collections", "items");
 * const { t } = useI18n();
 * <p>{t("collections.my_collections")}</p>
 */
export function useNamespaces(...ns: TranslationNamespace[]) {
  const { loadNamespaces, loadedNamespaces } = useI18n();

  useEffect(() => {
    const missing = ns.filter((n) => !loadedNamespaces.has(n));
    if (missing.length > 0) {
      loadNamespaces(...missing);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ns.join(",")]);
}

// -------------------------------------------------------------------
// Browser locale detection
// -------------------------------------------------------------------

function detectBrowserLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;

  // Check stored preference
  const cookie = document.cookie
    .split("; ")
    .find((c) => c.startsWith("STAKD_LOCALE="));
  if (cookie) {
    const stored = cookie.split("=")[1] as Locale;
    if (locales.includes(stored)) return stored;
  }

  // Check browser language
  const browserLang = navigator.language;
  // Exact match
  if (locales.includes(browserLang as Locale)) return browserLang as Locale;
  // Prefix match (e.g., "es-MX" -> "es")
  const prefix = browserLang.split("-")[0];
  const match = locales.find((l) => l.startsWith(prefix));
  if (match) return match;

  return defaultLocale;
}
