# Search System - Code Examples

## Example 1: Using the Search Hook in a Component

```typescript
"use client";

import { useSearch } from '@/hooks/useSearch';
import { Search } from 'lucide-react';

export default function SearchDemo() {
  const {
    query,
    results,
    loading,
    error,
    searchType,
    handleSearch,
    handleTypeChange,
  } = useSearch({ debounceMs: 300, limit: 10 });

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <input
        type="text"
        placeholder="Search items, collectors, restocks..."
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg"
      />

      {/* Type Filter */}
      <div className="flex gap-2">
        {['all', 'items', 'profiles', 'restocks'].map((type) => (
          <button
            key={type}
            onClick={() => handleTypeChange(type as any)}
            className={`px-4 py-2 rounded-lg ${
              searchType === type 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && <p>Searching...</p>}

      {/* Error State */}
      {error && <p className="text-red-500">Error: {error}</p>}

      {/* Results */}
      <div className="space-y-2">
        {results.all.map((result) => (
          <div
            key={`${result.type}-${result.id}`}
            className="p-4 border rounded-lg hover:bg-gray-50"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{result.title}</h3>
                {result.subtitle && (
                  <p className="text-sm text-gray-600">{result.subtitle}</p>
                )}
                {result.description && (
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {result.description}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs font-medium text-gray-600">
                  {result.type}
                </div>
                <div className="text-lg font-bold text-green-600">
                  {Math.round(result.relevanceScore * 100)}%
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* No Results */}
      {!loading && !error && results.all.length === 0 && query && (
        <p className="text-center text-gray-500">No results found</p>
      )}
    </div>
  );
}
```

## Example 2: Integrating SearchBar in Navbar

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SearchBar from '@/components/search/SearchBar';
import { LayoutDashboard } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-60 border-r bg-white h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold">
          STAKD
        </Link>
      </div>

      {/* Search Bar */}
      <div className="px-3 py-3 border-b">
        <SearchBar />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${
            pathname === "/dashboard"
              ? "bg-blue-500 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </Link>
        {/* More links... */}
      </nav>
    </aside>
  );
}
```

## Example 3: Search API Direct Usage

```typescript
"use client";

import { useState } from 'react';

export default function SearchAPI() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        type: 'all',
        limit: '20',
      });

      const response = await fetch(`/api/search?${params}`);
      const data = await response.json();

      if (data.success) {
        setResults(data.results);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          handleSearch(e.target.value);
        }}
        placeholder="Search..."
      />
      
      {loading && <p>Loading...</p>}
      
      <ul>
        {results.map((result) => (
          <li key={result.id}>
            <strong>{result.title}</strong> ({result.type})
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Example 4: Search with Filtering

```typescript
"use client";

import { useSearch } from '@/hooks/useSearch';

export default function FilteredSearch() {
  const { query, results, handleSearch, handleTypeChange } = useSearch();
  const [selectedCategory, setSelectedCategory] = useState('');

  const filteredResults = results.items.filter((item) => {
    if (!selectedCategory) return true;
    // Assuming category is in subtitle or attributes
    return item.subtitle?.toLowerCase().includes(selectedCategory.toLowerCase());
  });

  return (
    <div>
      <input
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search items..."
      />

      {/* Category Filter */}
      <div className="flex gap-2 mt-4">
        {['Pokemon', 'Sports Cards', 'Hot Wheels'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
            className={`px-4 py-2 rounded-lg ${
              selectedCategory === cat ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="mt-4 space-y-2">
        {filteredResults.map((item) => (
          <div key={item.id} className="p-4 border rounded-lg">
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Example 5: Real-Time Search Suggestions

```typescript
"use client";

import { useSearch } from '@/hooks/useSearch';
import { useRef, useState } from 'react';

export default function SearchSuggestions() {
  const { query, results, handleSearch, recentSearches } = useSearch({
    limit: 5,
  });
  const [showSuggestions, setShowSuggestions] = useState(false);

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => {
          handleSearch(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
        placeholder="Search..."
        className="w-full px-4 py-2 border rounded-lg"
      />

      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-lg z-10">
          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <div className="border-b p-2">
              <p className="text-xs font-semibold text-gray-600 mb-2">Recent</p>
              {recentSearches.slice(0, 3).map((search) => (
                <button
                  key={search}
                  onClick={() => handleSearch(search)}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100 rounded text-sm"
                >
                  {search}
                </button>
              ))}
            </div>
          )}

          {/* Search Results */}
          {query && (
            <div className="p-2">
              {results.all.length > 0 ? (
                results.all.map((result) => (
                  <a
                    key={`${result.type}-${result.id}`}
                    href={`/${result.type}/${result.id}`}
                    className="block px-4 py-2 hover:bg-gray-100 rounded text-sm"
                  >
                    <div className="font-medium">{result.title}</div>
                    <div className="text-xs text-gray-600">{result.subtitle}</div>
                  </a>
                ))
              ) : (
                <p className="px-4 py-2 text-sm text-gray-500">No results</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## Example 6: Pagination with Search

```typescript
"use client";

import { useState } from 'react';

export default function PaginatedSearch() {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [results, setResults] = useState<any[]>([]);
  const limit = 10;

  const handleSearch = async (searchQuery: string) => {
    const params = new URLSearchParams({
      q: searchQuery,
      limit: limit.toString(),
      offset: '0',
    });

    const response = await fetch(`/api/search?${params}`);
    const data = await response.json();
    setResults(data.results);
    setPage(0);
  };

  const handleNextPage = async () => {
    const newPage = page + 1;
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      offset: (newPage * limit).toString(),
    });

    const response = await fetch(`/api/search?${params}`);
    const data = await response.json();
    
    if (data.results.length > 0) {
      setResults(data.results);
      setPage(newPage);
    }
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          handleSearch(e.target.value);
        }}
        placeholder="Search..."
      />

      <div className="space-y-2 mt-4">
        {results.map((result) => (
          <div key={result.id} className="p-4 border rounded-lg">
            <h3>{result.title}</h3>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={() => setPage(Math.max(0, page - 1))}
          disabled={page === 0}
          className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50"
        >
          Previous
        </button>
        <span>Page {page + 1}</span>
        <button
          onClick={handleNextPage}
          disabled={results.length < limit}
          className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

## Example 7: Server-Side Search (with Authentication)

```typescript
import { createServerSupabase } from '@/lib/supabase/server';

async function searchItems(query: string) {
  const supabase = await createServerSupabase();
  
  // Authenticated search - respects RLS
  const { data, error } = await supabase
    .from('items')
    .select('id, title, brand, description')
    .textSearch('search_vector', query)
    .limit(20);

  if (error) throw error;
  return data;
}

// Usage in a Server Component
export async function SearchResults({ query }: { query: string }) {
  const items = await searchItems(query);

  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>
          <h3>{item.title}</h3>
          <p>{item.brand}</p>
        </li>
      ))}
    </ul>
  );
}
```

## Example 8: Analytics - Track Search Behavior

```typescript
"use client";

import { useSearch } from '@/hooks/useSearch';
import { useEffect } from 'react';

export default function SearchWithAnalytics() {
  const { query, results, handleSearch } = useSearch();

  // Track search clicks
  const trackClick = async (resultId: string, resultType: string) => {
    try {
      await fetch('/api/search/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          clickedId: resultId,
          clickedType: resultType,
        }),
      });
    } catch (error) {
      console.error('Analytics error:', error);
    }
  };

  return (
    <div>
      <input
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search..."
      />

      {results.all.map((result) => (
        <a
          key={result.id}
          href={getResultLink(result)}
          onClick={() => trackClick(result.id, result.type)}
          className="block p-4 border rounded-lg hover:bg-gray-50"
        >
          {result.title}
        </a>
      ))}
    </div>
  );
}

function getResultLink(result: any) {
  switch (result.type) {
    case 'item':
      return `/item/${result.id}`;
    case 'profile':
      return `/profile/${result.id}`;
    case 'restock':
      return `/restock/${result.id}`;
    default:
      return '#';
  }
}
```

## Example 9: Mobile Search Integration

```typescript
"use client";

import { useSearch } from '@/hooks/useSearch';
import { useState } from 'react';
import { Search, X } from 'lucide-react';

export default function MobileSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const { query, results, handleSearch, clearSearch } = useSearch();

  return (
    <>
      {/* Search Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-lg hover:bg-gray-100"
      >
        <Search className="w-5 h-5" />
      </button>

      {/* Search Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-white">
          <div className="flex items-center justify-between p-4 border-b">
            <input
              autoFocus
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search items, collectors..."
              className="flex-1 outline-none text-lg"
            />
            <button
              onClick={() => {
                setIsOpen(false);
                clearSearch();
              }}
              className="p-2 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto">
            {results.all.map((result) => (
              <a
                key={result.id}
                href={getResultLink(result)}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 p-4 border-b hover:bg-gray-50"
              >
                {result.imageUrl && (
                  <img
                    src={result.imageUrl}
                    alt={result.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-medium">{result.title}</h3>
                  {result.subtitle && (
                    <p className="text-sm text-gray-600">{result.subtitle}</p>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function getResultLink(result: any) {
  switch (result.type) {
    case 'item':
      return `/item/${result.id}`;
    case 'profile':
      return `/profile/${result.id}`;
    case 'restock':
      return `/restock/${result.id}`;
    default:
      return '#';
  }
}
```

---

## Tips & Best Practices

1. **Always debounce user input** - Use useSearch hook's built-in debouncing
2. **Handle loading and error states** - Provide user feedback
3. **Limit initial results** - Start with 10-20, allow pagination
4. **Use type filters** - Let users narrow search scope
5. **Track analytics** - Monitor search behavior for insights
6. **Optimize images** - Use thumbnails, lazy load
7. **Cache results** - The API caches for 30 seconds
8. **Escape special characters** - Query is sanitized, but be careful
9. **Mobile-first design** - Test on mobile devices
10. **Keyboard accessibility** - Support Cmd+K / Ctrl+K shortcut
