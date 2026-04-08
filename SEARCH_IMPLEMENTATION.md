# Full-Text Search Implementation Guide for STAKD

## Quick Start (5 minutes)

### Step 1: Deploy Database Migration
Run the SQL migration to set up search infrastructure:

```bash
cd /path/to/stakd-app
supabase db push
# This applies migration 025_full_text_search.sql
```

**What it does:**
- Adds `search_vector` tsvector columns to items, profiles, and restocks tables
- Creates GIN indexes for fast full-text search
- Creates trigram indexes for fuzzy matching
- Sets up auto-update triggers
- Creates search_logs and search_rate_limits tables

### Step 2: Verify Search Functionality
Test the search API:

```bash
curl "http://localhost:3000/api/search?q=pokemon&type=items&limit=5"
```

### Step 3: Integrate SearchBar into UI (Optional)

**Option A: Add to Navbar (Desktop)**
Edit `src/components/layout/Navbar.tsx`:

```typescript
// Add import
import SearchBar from '@/components/search/SearchBar';

// Add to navbar header, after the logo section:
<div className="px-3 py-3 border-b border-[var(--color-border)]">
  <SearchBar />
</div>
```

**Option B: Update Mobile Search Button**
Edit `src/components/layout/MobileHeader.tsx`:

```typescript
// Change the search button from button to Link:
import Link from "next/link";

// Replace this:
<button className="p-2 rounded-xl...">
  <Search className="..." />
</button>

// With this:
<Link href="/search" className="p-2 rounded-xl...">
  <Search className="..." />
</Link>
```

### Step 4: Access Search
- Full search page: `/search`
- API endpoint: `/api/search?q=...`
- Quick search in navbar: Cmd+K (Mac) or Ctrl+K (Windows/Linux)

## File Locations & Quick Reference

| Component | Location | Purpose |
|-----------|----------|---------|
| SQL Migration | `supabase/migrations/025_full_text_search.sql` | Database schema & indexes |
| Search API | `src/app/api/search/route.ts` | Backend search endpoint |
| Search Hook | `src/hooks/useSearch.ts` | React hook for search logic |
| Search Page | `src/app/(main)/search/page.tsx` | Full-page search UI |
| SearchBar | `src/components/search/SearchBar.tsx` | Navbar quick search |

## API Endpoint

### GET /api/search

**Query Parameters:**
```
q (string, required)          - Search query (min 2 chars)
type (string, optional)       - 'items' | 'profiles' | 'restocks' | 'all' (default: 'all')
category (string, optional)   - Filter items by category
limit (number, optional)      - Results per page (default: 20, max: 100)
offset (number, optional)     - Pagination offset (default: 0)
```

**Example Requests:**
```bash
# Search all types
GET /api/search?q=pokemon

# Search only items
GET /api/search?q=charizard&type=items

# Search profiles (collectors)
GET /api/search?q=john&type=profiles

# Search restocks with pagination
GET /api/search?q=target&type=restocks&limit=10&offset=0

# Filter items by category
GET /api/search?q=pokémon&type=items&category=pokemon
```

**Response Example:**
```json
{
  "success": true,
  "results": [
    {
      "id": "uuid-string",
      "type": "item",
      "title": "Charizard Card",
      "subtitle": "Pokémon Base Set",
      "description": "Holographic, excellent condition",
      "imageUrl": "https://...",
      "relevanceScore": 0.95
    }
  ],
  "total": 42,
  "timestamp": "2026-04-07T23:15:00Z"
}
```

## React Hook Usage

```typescript
import { useSearch } from '@/hooks/useSearch';

function MyComponent() {
  const {
    query,              // Current search string
    results,            // { items: [], profiles: [], restocks: [], all: [] }
    loading,            // Boolean
    error,              // Error message or null
    searchType,         // 'items' | 'profiles' | 'restocks' | 'all'
    recentSearches,     // Array of recent search strings
    handleSearch,       // (query: string, type?: string) => void
    handleTypeChange,   // (type: string) => void
    clearSearch,        // () => void
    performSearch,      // (query: string, type?: string) => Promise<void>
  } = useSearch({
    debounceMs: 300,    // Optional: debounce delay
    limit: 20,          // Optional: results per search
    initialType: 'all', // Optional: initial search type
  });

  return (
    <>
      <input 
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search..."
      />
      
      {loading && <p>Searching...</p>}
      
      {results.all.map(result => (
        <div key={result.id}>
          <h3>{result.title}</h3>
          <p>{result.description}</p>
          <span>{Math.round(result.relevanceScore * 100)}% match</span>
        </div>
      ))}
    </>
  );
}
```

## Database Schema

### search_vector Columns Added
```sql
ALTER TABLE items ADD COLUMN search_vector tsvector;
ALTER TABLE profiles ADD COLUMN search_vector tsvector;
ALTER TABLE restocks ADD COLUMN search_vector tsvector;
```

### Indexes Created
```sql
-- Full-text search indexes (GIN)
CREATE INDEX idx_items_search_vector ON items USING GIN(search_vector);
CREATE INDEX idx_profiles_search_vector ON profiles USING GIN(search_vector);
CREATE INDEX idx_restocks_search_vector ON restocks USING GIN(search_vector);

-- Fuzzy matching indexes (Trigram)
CREATE INDEX idx_items_title_trgm ON items USING GIN(title gin_trgm_ops);
CREATE INDEX idx_profiles_username_trgm ON profiles USING GIN(username gin_trgm_ops);
CREATE INDEX idx_profiles_display_name_trgm ON profiles USING GIN(display_name gin_trgm_ops);
CREATE INDEX idx_restocks_store_name_trgm ON restocks USING GIN(store_name gin_trgm_ops);
```

### Support Tables
```sql
CREATE TABLE search_logs (
  id UUID PRIMARY KEY,
  user_id UUID,           -- Nullable for unauthenticated searches
  query TEXT NOT NULL,
  search_type TEXT NOT NULL,
  result_count INTEGER,
  clicked_entity_id UUID,
  clicked_entity_type TEXT,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE search_rate_limits (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  search_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, window_start)
);
```

## Performance Characteristics

| Metric | Expected Value | Notes |
|--------|----------------|-------|
| Single search latency | 50-200ms | Depends on dataset size and query complexity |
| API response time | <500ms | Includes DB query + response serialization |
| Search result limit | 20-100 | Configurable, trade-off with latency |
| Rate limit | 30 searches/min | Per user/IP |
| Memory usage | ~50MB | For search vectors and indexes |
| Index size | ~100-500MB | Depends on dataset size |

## Rate Limiting

**Limits:**
- 30 searches per minute per user (or IP if not authenticated)
- Returns HTTP 429 if exceeded
- Graceful fallback if rate limiting fails

**Implementation:**
- Uses `search_rate_limits` table with rolling 60-second windows
- Checked at API route before search execution
- Non-blocking (fails open if storage is unavailable)

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+K (Mac) / Ctrl+K (Win/Linux) | Focus search bar |
| Escape | Close search dropdown |
| Enter | Go to full search page |

## Troubleshooting

### "Search returns no results"
1. Verify migration applied: `supabase db list` should show migration 025
2. Check search_vector is populated:
   ```sql
   SELECT COUNT(*) FROM items WHERE search_vector IS NOT NULL;
   ```
3. If empty, trigger backfill (see below)

### "Search is slow"
1. Verify indexes exist:
   ```sql
   SELECT * FROM pg_indexes WHERE tablename IN ('items', 'profiles', 'restocks');
   ```
2. Run query analyze:
   ```sql
   VACUUM ANALYZE items;
   VACUUM ANALYZE profiles;
   VACUUM ANALYZE restocks;
   ```

### "Rate limiting not working"
1. Check `search_rate_limits` has data:
   ```sql
   SELECT * FROM search_rate_limits LIMIT 10;
   ```
2. Verify RLS is enabled and working

### "SearchBar not appearing in navbar"
1. Verify import is correct
2. Check component path: `src/components/search/SearchBar.tsx`
3. Verify SearchBar doesn't have TypeScript errors

## Backfill Existing Data

If migration doesn't populate existing data, run this:

```sql
-- Items
UPDATE public.items
SET search_vector = to_tsvector('english',
  COALESCE(title, '') || ' ' ||
  COALESCE(brand, '') || ' ' ||
  COALESCE(category, '') || ' ' ||
  COALESCE(description, '')
)
WHERE search_vector IS NULL;

-- Profiles
UPDATE public.profiles
SET search_vector = to_tsvector('english',
  COALESCE(username, '') || ' ' ||
  COALESCE(display_name, '') || ' ' ||
  COALESCE(bio, '')
)
WHERE search_vector IS NULL;

-- Restocks
UPDATE public.restocks
SET search_vector = to_tsvector('english',
  COALESCE(store_name, '') || ' ' ||
  COALESCE(description, '') || ' ' ||
  COALESCE(store_address, '') || ' ' ||
  COALESCE(item_found, '')
)
WHERE search_vector IS NULL;
```

## Cost Considerations

For AWS/Supabase:
- **Storage**: ~100-500MB for indexes (minimal)
- **Compute**: Minimal - indexes are pre-built
- **Queries**: Full-text search is O(log n) due to GIN indexes
- **Logging**: ~1-5KB per search logged

Estimated monthly cost for 10K searches: **<$1 additional**

## Next Steps

1. ✅ Run database migration
2. ✅ Test API endpoint
3. ✅ Integrate SearchBar component (optional)
4. ✅ Add to navigation (optional)
5. ✅ Monitor search_logs for analytics
6. Consider future enhancements (see SEARCH_IMPLEMENTATION.md for details)

## Support & Questions

For issues or questions:
1. Check troubleshooting section above
2. Review search_logs table for error patterns
3. Check browser console for client-side errors
4. Verify migration was applied correctly

---

**Implementation Date:** April 7, 2026  
**Status:** Production Ready  
**Maintenance:** Automatic (triggers handle updates)
