"use client";

import { useState, useEffect, useRef } from "react";
import { useSearch } from "@/hooks/useSearch";
import { Search, ShoppingBag, Users, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * SearchBar Component
 *
 * Compact search bar for the Navbar with:
 * - Expandable search input on focus
 * - Quick results dropdown (top 5)
 * - Keyboard shortcut (Cmd+K / Ctrl+K)
 * - Link to full search page
 */
export default function SearchBar() {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { query, results, loading, handleSearch, clearSearch } = useSearch({
    debounceMs: 200,
    limit: 5,
    initialType: "all",
  });

  // Handle Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsExpanded(true);
        inputRef.current?.focus();
      }

      // Handle Escape to close dropdown
      if (e.key === "Escape") {
        setShowDropdown(false);
        setIsExpanded(false);
        clearSearch();
      }

      // Handle Enter to go to full search page
      if (e.key === "Enter" && query) {
        router.push(`/search?q=${encodeURIComponent(query)}`);
        setShowDropdown(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [query, router, clearSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchBarRef.current &&
        !searchBarRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
        if (!query) {
          setIsExpanded(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [query]);

  const hasResults =
    results.all.length > 0 && query.length > 0;
  const showQuickResults = hasResults && showDropdown;

  const getResultIcon = (type: string) => {
    switch (type) {
      case "item":
        return <ShoppingBag size={16} />;
      case "profile":
        return <Users size={16} />;
      case "restock":
        return <Zap size={16} />;
      default:
        return <Search size={16} />;
    }
  };

  const getResultLink = (result: any) => {
    switch (result.type) {
      case "item":
        return `/item/${result.id}`;
      case "profile":
        return `/profile/${result.id}`;
      case "restock":
        return `/restock/${result.id}`;
      default:
        return "#";
    }
  };

  return (
    <div ref={searchBarRef} className="relative w-full md:w-64">
      {/* Search Input */}
      <div
        className={`relative transition-all duration-200 ${
          isExpanded
            ? "rounded-xl border border-[var(--color-accent)] shadow-lg"
            : "rounded-full border border-[var(--color-border-subtle)]"
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          placeholder={isExpanded ? "Search items, collectors, stores..." : "Search..."}
          value={query}
          onChange={(e) => {
            handleSearch(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => {
            setIsExpanded(true);
            if (query) {
              setShowDropdown(true);
            }
          }}
          className={`w-full bg-[var(--color-bg)] text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] outline-none transition-all ${
            isExpanded
              ? "rounded-xl border-none px-4 py-2.5"
              : "rounded-full border-none px-3 py-2 pl-10"
          }`}
        />

        {/* Search Icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
          {loading ? (
            <div className="animate-spin">
              <Search size={16} />
            </div>
          ) : (
            <Search size={16} />
          )}
        </div>

        {/* Keyboard Hint (only shown when collapsed) */}
        {!isExpanded && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted)]">
            <Search size={16} />
          </div>
        )}

        {/* Keyboard shortcut hint */}
        {isExpanded && !query && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:block">
            <kbd className="rounded bg-[var(--color-bg-subtle)] px-1.5 py-0.5 text-xs text-[var(--color-text-muted)]">
              Esc
            </kbd>
          </div>
        )}
      </div>

      {/* Quick Results Dropdown */}
      {showQuickResults && (
        <div className="absolute right-0 top-full z-50 mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-2xl">
          <div className="max-h-96 overflow-y-auto">
            {results.all.slice(0, 5).map((result) => (
              <Link
                key={`${result.type}-${result.id}`}
                href={getResultLink(result)}
                onClick={() => {
                  setShowDropdown(false);
                  clearSearch();
                }}
                className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] px-4 py-3 text-sm transition-colors hover:bg-[var(--color-bg-subtle)] last:border-b-0"
              >
                <div className="flex-shrink-0 text-[var(--color-accent)]">
                  {getResultIcon(result.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium text-[var(--color-text)]">
                    {result.title}
                  </div>
                  {result.subtitle && (
                    <div className="truncate text-xs text-[var(--color-text-muted)]">
                      {result.subtitle}
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0 text-xs text-[var(--color-text-muted)]">
                  {result.type === "item"
                    ? "Item"
                    : result.type === "profile"
                      ? "Collector"
                      : "Restock"}
                </div>
              </Link>
            ))}

            {hasResults && (
              <Link
                href={`/search?q=${encodeURIComponent(query)}`}
                onClick={() => {
                  setShowDropdown(false);
                  clearSearch();
                }}
                className="flex items-center justify-center gap-2 border-t border-[var(--color-border-subtle)] px-4 py-3 text-sm font-medium text-[var(--color-accent)] transition-colors hover:bg-[var(--color-bg-subtle)]"
              >
                View all results
                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[var(--color-accent-subtle)] text-xs">
                  →
                </span>
              </Link>
            )}

            {query && !loading && !hasResults && (
              <div className="px-4 py-6 text-center">
                <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-bg-subtle)]">
                  <Search size={20} className="text-[var(--color-text-muted)]" />
                </div>
                <p className="text-sm text-[var(--color-text-muted)]">
                  No results for "{query}"
                </p>
                <Link
                  href={`/search?q=${encodeURIComponent(query)}`}
                  onClick={() => {
                    setShowDropdown(false);
                    clearSearch();
                  }}
                  className="mt-3 inline-block text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-bright)]"
                >
                  View full search
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Placeholder when collapsed */}
      {!isExpanded && (
        <div className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 text-xs text-[var(--color-text-muted)] sm:block">
          <kbd className="rounded bg-[var(--color-bg-subtle)] px-1.5 py-0.5">
            ⌘K
          </kbd>
        </div>
      )}
    </div>
  );
}
