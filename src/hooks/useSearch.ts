"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";

export interface SearchResult {
  id: string;
  type: "item" | "profile" | "restock";
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  relevanceScore: number;
}

export interface SearchResultsGrouped {
  items: SearchResult[];
  profiles: SearchResult[];
  restocks: SearchResult[];
  all: SearchResult[];
}

interface SearchResponse {
  success: boolean;
  results: SearchResult[];
  total: number;
  timestamp: string;
}

interface UseSearchOptions {
  debounceMs?: number;
  limit?: number;
  initialType?: "items" | "profiles" | "restocks" | "all";
}

export function useSearch(options: UseSearchOptions = {}) {
  const {
    debounceMs = 300,
    limit = 20,
    initialType = "all",
  } = options;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultsGrouped>({
    items: [],
    profiles: [],
    restocks: [],
    all: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<
    "items" | "profiles" | "restocks" | "all"
  >(initialType);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load recent searches from state (not localStorage)
  useEffect(() => {
    // Initialize from sessionStorage or empty array
    try {
      const stored = sessionStorage.getItem("recentSearches");
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const addToRecentSearches = useCallback((searchQuery: string) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s !== searchQuery);
      const updated = [searchQuery, ...filtered].slice(0, 10);
      try {
        sessionStorage.setItem("recentSearches", JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  }, []);

  const performSearch = useCallback(
    async (searchQuery: string, type: string = searchType) => {
      if (!searchQuery || searchQuery.length < 2) {
        setResults({
          items: [],
          profiles: [],
          restocks: [],
          all: [],
        });
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        const params = new URLSearchParams({
          q: searchQuery,
          type,
          limit: limit.toString(),
        });

        const response = await fetch(`/api/search?${params}`, {
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `Search failed with status ${response.status}`
          );
        }

        const data: SearchResponse = await response.json();

        if (data.success) {
          // Group results by type
          const grouped: SearchResultsGrouped = {
            items: data.results.filter((r) => r.type === "item"),
            profiles: data.results.filter((r) => r.type === "profile"),
            restocks: data.results.filter((r) => r.type === "restock"),
            all: data.results,
          };

          setResults(grouped);
          addToRecentSearches(searchQuery);
        } else {
          throw new Error("Search returned no success status");
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // Request was cancelled, don't update error state
          return;
        }
        const errorMessage =
          err instanceof Error ? err.message : "Search failed";
        setError(errorMessage);
        setResults({
          items: [],
          profiles: [],
          restocks: [],
          all: [],
        });
      } finally {
        setLoading(false);
      }
    },
    [searchType, limit, addToRecentSearches]
  );

  const handleSearch = useCallback(
    (newQuery: string, newType?: string) => {
      setQuery(newQuery);

      // Clear any pending debounce
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Set debounce timeout
      debounceTimeoutRef.current = setTimeout(() => {
        performSearch(newQuery, newType || searchType);
      }, debounceMs);
    },
    [debounceMs, performSearch, searchType]
  );

  const handleTypeChange = useCallback(
    (newType: "items" | "profiles" | "restocks" | "all") => {
      setSearchType(newType);
      if (query.length >= 2) {
        performSearch(query, newType);
      }
    },
    [query, performSearch]
  );

  const clearSearch = useCallback(() => {
    setQuery("");
    setResults({
      items: [],
      profiles: [],
      restocks: [],
      all: [],
    });
    setError(null);
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
  }, []);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return useMemo(
    () => ({
      query,
      results,
      loading,
      error,
      searchType,
      recentSearches,
      handleSearch,
      handleTypeChange,
      clearSearch,
      performSearch,
    }),
    [
      query,
      results,
      loading,
      error,
      searchType,
      recentSearches,
      handleSearch,
      handleTypeChange,
      clearSearch,
      performSearch,
    ]
  );
}
