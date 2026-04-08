"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearch } from "@/hooks/useSearch";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Search, Zap, Users, ShoppingBag, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";

interface ItemResult {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  relevanceScore: number;
}

interface ProfileResult {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  relevanceScore: number;
}

interface RestockResult {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  relevanceScore: number;
}

export default function SearchPage() {
  const {
    query,
    results,
    loading,
    error,
    searchType,
    recentSearches,
    handleSearch,
    handleTypeChange,
    clearSearch,
  } = useSearch({ debounceMs: 300, limit: 20, initialType: "all" });

  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const categories = [
    "Pokémon",
    "Sports Cards",
    "Hot Wheels",
    "Trading Cards",
    "Vintage",
    "Memorabilia",
  ];

  const displayResults = useMemo(() => {
    switch (searchType) {
      case "items":
        return results.items;
      case "profiles":
        return results.profiles;
      case "restocks":
        return results.restocks;
      default:
        return results.all;
    }
  }, [results, searchType]);

  const hasResults = displayResults.length > 0;
  const showRecentSearches = !query && recentSearches.length > 0;
  const showEmptyState = query && !loading && !hasResults && !error;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-6">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-text)]">Search</h1>
          <p className="mt-2 text-[var(--color-text-muted)]">
            Find items, collectors, and restocks in the STAKD community
          </p>
        </div>

        {/* Search Input */}
        <div className="mb-8">
          <Input
            type="text"
            placeholder="Search items, collectors, stores..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            icon={<Search size={18} />}
            className="text-base"
          />
        </div>

        {/* Type Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {["all", "items", "profiles", "restocks"].map((type) => (
            <Button
              key={type}
              variant={searchType === type ? "primary" : "secondary"}
              size="sm"
              onClick={() =>
                handleTypeChange(
                  type as "items" | "profiles" | "restocks" | "all"
                )
              }
              className="capitalize"
            >
              {type === "all"
                ? "All"
                : type === "items"
                  ? "Items"
                  : type === "profiles"
                    ? "Collectors"
                    : "Restocks"}
            </Button>
          ))}
        </div>

        {/* Category Filter (only for items) */}
        {searchType === "items" && query && (
          <div className="mb-6">
            <p className="mb-2 text-sm font-medium text-[var(--color-text-secondary)]">
              Filter by Category
            </p>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant="secondary"
                  size="sm"
                  className="text-xs"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card
                key={i}
                className="h-24 animate-pulse bg-[var(--color-bg-subtle)]"
              />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-[var(--color-danger-subtle)] bg-[var(--color-danger-subtle)] p-4">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={20}
                className="flex-shrink-0 text-[var(--color-danger)]"
              />
              <div>
                <h3 className="font-semibold text-[var(--color-danger)]">
                  Search Error
                </h3>
                <p className="text-sm text-[var(--color-text-muted)]">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Results */}
        {hasResults && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-text-muted)]">
              Found {displayResults.length} result
              {displayResults.length !== 1 ? "s" : ""}
            </p>

            {displayResults.map((result, index) => (
              <SearchResultCard
                key={`${result.type}-${result.id}`}
                result={result}
                index={index}
                isFocused={focusedIndex === index}
                onFocus={() => setFocusedIndex(index)}
              />
            ))}
          </div>
        )}

        {/* Recent Searches */}
        {showRecentSearches && (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Clock size={16} className="text-[var(--color-text-muted)]" />
              <h2 className="font-semibold text-[var(--color-text)]">
                Recent Searches
              </h2>
            </div>
            <div className="space-y-2">
              {recentSearches.map((search) => (
                <button
                  key={search}
                  onClick={() => handleSearch(search)}
                  className="block w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] px-4 py-3 text-left text-sm text-[var(--color-text)] transition-all hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-card)]"
                >
                  {search}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {showEmptyState && (
          <div className="text-center">
            <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-bg-subtle)]">
              <Search size={28} className="text-[var(--color-text-muted)]" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">
              No results found
            </h3>
            <p className="mb-6 text-[var(--color-text-muted)]">
              Try searching with different keywords or filters
            </p>
            <div className="flex flex-col gap-2">
              {recentSearches.length > 0 && (
                <button
                  onClick={() => handleSearch(recentSearches[0])}
                  className="text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-bright)]"
                >
                  Try recent search: "{recentSearches[0]}"
                </button>
              )}
              <button
                onClick={clearSearch}
                className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                Clear search
              </button>
            </div>
          </div>
        )}

        {/* No Query State */}
        {!query && !showRecentSearches && (
          <div className="space-y-8">
            <div>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--color-text)]">
                <Zap size={18} className="text-[var(--color-accent)]" />
                Trending Searches
              </h2>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {[
                  "Pokémon Charizard",
                  "Jordan PSA 10",
                  "Hot Wheels Rare",
                  "Vintage Cards",
                  "Graded Comics",
                  "First Edition",
                ].map((trend) => (
                  <button
                    key={trend}
                    onClick={() => handleSearch(trend)}
                    className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] px-4 py-2 text-sm text-[var(--color-text)] transition-all hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-card)]"
                  >
                    {trend}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--color-text)]">
                <ShoppingBag size={18} className="text-[var(--color-value)]" />
                Popular Categories
              </h2>
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      handleTypeChange("items");
                      handleSearch(category);
                    }}
                    className="block w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] px-4 py-3 text-left text-sm text-[var(--color-text)] transition-all hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-card)]"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--color-text)]">
                <Users size={18} className="text-[var(--color-accent)]" />
                Find Collectors
              </h2>
              <p className="mb-4 text-sm text-[var(--color-text-muted)]">
                Search by username or display name to find other collectors in the
                STAKD community
              </p>
              <Button
                onClick={() => handleTypeChange("profiles")}
                variant="secondary"
                className="w-full"
              >
                Search Collectors
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface SearchResultCardProps {
  result: any;
  index: number;
  isFocused: boolean;
  onFocus: () => void;
}

function SearchResultCard({
  result,
  index,
  isFocused,
  onFocus,
}: SearchResultCardProps) {
  const getIcon = () => {
    switch (result.type) {
      case "item":
        return <ShoppingBag size={18} />;
      case "profile":
        return <Users size={18} />;
      case "restock":
        return <Zap size={18} />;
      default:
        return <Search size={18} />;
    }
  };

  const getLink = () => {
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

  const relevancePercent = Math.round(result.relevanceScore * 100);

  return (
    <Link href={getLink()}>
      <Card
        hover
        elevation={isFocused ? "floating" : "flat"}
        onMouseEnter={onFocus}
        className="overflow-hidden p-4 transition-all"
      >
        <div className="flex gap-4">
          {result.imageUrl && (
            <div className="flex-shrink-0">
              <img
                src={result.imageUrl}
                alt={result.title}
                className="h-20 w-20 rounded-lg object-cover"
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-[var(--color-accent)]">{getIcon()}</div>
                  <h3 className="truncate text-base font-semibold text-[var(--color-text)]">
                    {result.title}
                  </h3>
                </div>

                {result.subtitle && (
                  <p className="mt-1 truncate text-sm text-[var(--color-text-secondary)]">
                    {result.subtitle}
                  </p>
                )}

                {result.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--color-text-muted)]">
                    {result.description}
                  </p>
                )}
              </div>

              <div className="flex-shrink-0 text-right">
                <div className="inline-flex items-center gap-1 rounded-full bg-[var(--color-bg-subtle)] px-2 py-1">
                  <div className="text-xs font-semibold text-[var(--color-accent)]">
                    {relevancePercent}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
