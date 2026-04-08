# Price Engine Integration Guide

This guide shows how to integrate the new real-time price engine into existing STAKD components and pages.

## Quick Start

### 1. Environment Setup

Ensure your `.env.local` has the cron secret:

```env
CRON_SECRET=your-secure-random-string-here
```

### 2. Set Up the Cron Job

Configure your deployment platform to call the price update endpoint:

**Vercel** (cron.json):
```json
{
  "crons": [
    {
      "path": "/api/cron/prices",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

**AWS Lambda / Google Cloud Scheduler**:
```bash
# Every 6 hours
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://your-domain.com/api/cron/prices
```

**Manual Testing**:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/prices
```

## Common Integration Patterns

### Pattern 1: Item Detail Page with Full Pricing

**File**: `src/app/items/[id]/page.tsx`

```typescript
import PriceDisplay from "@/components/pricing/PriceDisplay";
import { getFullPriceData } from "@/services/pricing";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  // Fetch item from DB
  const supabase = await createServiceRoleClient();
  const { data: item } = await supabase
    .from("items")
    .select("*")
    .eq("id", id)
    .single();

  if (!item) return <div>Item not found</div>;

  // Get live pricing (optional—component will auto-fetch via hook)
  const pricing = await getFullPriceData(
    item.category,
    item.title,
    item.attributes,
    item.estimated_value,
    item.condition
  );

  return (
    <div className="space-y-6">
      <h1>{item.title}</h1>
      
      {/* Full price display with condition selector */}
      <PriceDisplay
        itemId={id}
        retailPrice={pricing.retailPrice}
        resellPrice={pricing.resellPrice}
        condition={item.condition}
        mode="full"
        showChart={true}
      />

      {/* Additional item details */}
      <div className="space-y-2">
        <p><strong>Category:</strong> {item.category}</p>
        <p><strong>Confidence:</strong> {pricing.confidence}</p>
        <p><strong>Data Source:</strong> {pricing.source}</p>
      </div>
    </div>
  );
}
```

### Pattern 2: Collection View with Quick Pricing

**File**: `src/components/collection/CollectionGrid.tsx`

```typescript
"use client";

import { useState } from "react";
import PriceDisplay from "@/components/pricing/PriceDisplay";
import type { Item } from "@/types/database";

export function CollectionGrid({ items }: { items: Item[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((item) => (
        <div
          key={item.id}
          className="border rounded-lg p-4 hover:shadow-lg transition"
        >
          {/* Item image and basic info */}
          <div className="mb-4">
            <h3 className="font-semibold text-lg">{item.title}</h3>
            <p className="text-sm text-gray-600">{item.category}</p>
          </div>

          {/* Compact price display */}
          <PriceDisplay
            itemId={item.id}
            retailPrice={item.estimated_value}
            mode="compact"
            showChart={false}
          />
        </div>
      ))}
    </div>
  );
}
```

### Pattern 3: Portfolio Summary with Total Value

**File**: `src/components/portfolio/PortfolioSummary.tsx`

```typescript
"use client";

import { useMemo } from "react";
import { usePriceUpdates } from "@/hooks/usePriceUpdates";
import type { Item } from "@/types/database";

export function PortfolioSummary({ items }: { items: Item[] }) {
  const priceData = items.map((item) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { price } = usePriceUpdates(item.id);
    return { item, price };
  });

  const summary = useMemo(() => {
    let totalRetail = 0;
    let totalResell = 0;

    priceData.forEach(({ price }) => {
      if (price?.avgPrice) {
        totalRetail += price.avgPrice;
        totalResell += price.minPrice || price.avgPrice * 0.65;
      }
    });

    return {
      totalRetail,
      totalResell,
      totalSpread: totalRetail - totalResell,
    };
  }, [priceData]);

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white p-4 rounded-lg border">
        <div className="text-sm text-gray-600">Retail Value</div>
        <div className="text-2xl font-bold">
          ${summary.totalRetail.toFixed(2)}
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="text-sm text-gray-600">Resell Value</div>
        <div className="text-2xl font-bold text-blue-600">
          ${summary.totalResell.toFixed(2)}
        </div>
      </div>

      <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
        <div className="text-sm text-gray-600">Potential Loss</div>
        <div className="text-2xl font-bold text-amber-600">
          ${summary.totalSpread.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
```

### Pattern 4: Item Creation Form with Price Preview

**File**: `src/components/item/CreateItemForm.tsx`

```typescript
"use client";

import { useState } from "react";
import { getFullPriceData } from "@/services/pricing";

export function CreateItemForm() {
  const [formData, setFormData] = useState({
    title: "",
    category: "pokemon",
    attributes: {},
    condition: "raw",
  });
  const [pricePreview, setPricePreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleTitleChange = async (title: string) => {
    setFormData((prev) => ({ ...prev, title }));

    // Preview price as user types
    if (title && title.length > 2) {
      setLoading(true);
      const price = await getFullPriceData(
        formData.category,
        title,
        formData.attributes,
        undefined,
        formData.condition
      );
      setPricePreview(price);
      setLoading(false);
    }
  };

  const handleCategoryChange = async (category: string) => {
    setFormData((prev) => ({ ...prev, category }));
    
    // Refresh price preview when category changes
    if (formData.title) {
      setLoading(true);
      const price = await getFullPriceData(
        category,
        formData.title,
        formData.attributes,
        undefined,
        formData.condition
      );
      setPricePreview(price);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="Card name or item title"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Category</label>
        <select
          value={formData.category}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        >
          <option value="pokemon">Pokemon TCG</option>
          <option value="yugioh">Yu-Gi-Oh</option>
          <option value="sports_cards">Sports Cards</option>
          <option value="hot_wheels">Hot Wheels</option>
          <option value="funko">Funko Pops</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Price Preview */}
      {pricePreview && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-sm font-medium text-gray-700 mb-2">
            Price Preview
          </div>
          {pricePreview.retailPrice ? (
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-gray-600">Estimated Retail:</span>
                <span className="font-semibold ml-2">
                  ${pricePreview.retailPrice.toFixed(2)}
                </span>
              </div>
              {pricePreview.resellPrice && (
                <div>
                  <span className="text-gray-600">Resell Value:</span>
                  <span className="font-semibold ml-2 text-blue-600">
                    ${pricePreview.resellPrice.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="text-xs text-gray-500 mt-2">
                Source: {pricePreview.source} · Confidence: {pricePreview.confidence}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              No pricing data available
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="text-sm text-gray-600 flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          Fetching prices...
        </div>
      )}
    </div>
  );
}
```

### Pattern 5: Admin Pricing Dashboard

**File**: `src/app/admin/pricing/page.tsx`

```typescript
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/ui/Card";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";

export default function PricingDashboard() {
  const [stats, setStats] = useState({
    lastCronRun: null as string | null,
    itemsWithPrices: 0,
    significantMoves: 0,
    avgDataQuality: "high" as string,
  });
  const [recentUpdates, setRecentUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    const loadStats = async () => {
      // Get items with pricing
      const { data: items } = await supabase
        .from("items")
        .select("id, estimated_value, updated_at")
        .not("estimated_value", "is", null);

      // Get recent price history
      const { data: recent } = await supabase
        .from("price_history")
        .select("*, items(title, category)")
        .order("fetched_at", { ascending: false })
        .limit(10);

      setStats({
        lastCronRun: items?.[0]?.updated_at || null,
        itemsWithPrices: items?.length || 0,
        significantMoves: 0, // Would calculate from snapshots
        avgDataQuality: "high",
      });

      setRecentUpdates(recent || []);
      setLoading(false);
    };

    loadStats();
  }, [supabase]);

  if (loading) {
    return <Loader2 className="animate-spin" />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Pricing Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-sm text-gray-600">Items with Prices</div>
          <div className="text-2xl font-bold">{stats.itemsWithPrices}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-600">Data Quality</div>
          <div className="text-lg font-semibold capitalize">{stats.avgDataQuality}</div>
        </Card>
      </div>

      {/* Recent Updates */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">Recent Price Updates</h2>
        <div className="space-y-3">
          {recentUpdates.map((update) => (
            <div key={update.id} className="flex items-center justify-between p-3 border rounded">
              <div>
                <div className="font-medium">{update.items?.title}</div>
                <div className="text-sm text-gray-600">{update.source}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">${update.price.toFixed(2)}</div>
                <div className="text-xs text-gray-500">
                  {new Date(update.fetched_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Cron Job Controls */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">Cron Job</h2>
        <div className="space-y-3">
          <div>
            <div className="text-sm text-gray-600">Last Run</div>
            <div className="font-medium">
              {stats.lastCronRun
                ? new Date(stats.lastCronRun).toLocaleString()
                : "Never"}
            </div>
          </div>
          <button
            onClick={async () => {
              const res = await fetch("/api/cron/prices", {
                headers: {
                  Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ""}`,
                },
              });
              const data = await res.json();
              alert(`Updated ${data.pricesUpdated} items`);
              location.reload();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Run Now
          </button>
        </div>
      </Card>
    </div>
  );
}
```

## Data Flow Diagram

```
User adds item
    ↓
[CreateItemForm] fetches price preview
    ↓
Item saved to DB with estimated_value
    ↓
Cron job every 6 hours:
    ├→ Fetch items not updated in 24h
    ├→ Call getFullPriceData() for each
    ├→ Store in price_history
    ├→ Upsert price_snapshots
    └→ Update items.estimated_value
    ↓
[usePriceUpdates] hook subscribes to realtime
    ├→ Loads 7-day price_snapshots
    ├→ Listens for new inserts
    └→ Updates UI when prices change
    ↓
[PriceDisplay] component renders:
    ├→ Retail + Resell prices
    ├→ Condition selector
    ├→ Trend indicators
    └→ 7-day sparkline chart
```

## Backward Compatibility

The new engine is **fully backward compatible**:

- Old code using `getMarketPrice()` still works
- Existing item schemas don't need migration
- Database tables already exist (migration 003)
- You can mix old and new code during transition

**Example**: Using legacy API alongside new engine:

```typescript
// Old way (still works)
const { marketPrice } = await getMarketPrice("pokemon", "Charizard");

// New way (recommended)
const { retailPrice, resellPrice } = await getFullPriceData("pokemon", "Charizard");
```

## Performance Tips

1. **Cache aggressively**: Prices are stable hour-to-hour
   ```typescript
   // In components
   const { price, history } = usePriceUpdates(itemId);
   // Caches for 1 hour automatically
   ```

2. **Batch pricing lookups**: For multiple items, query all at once
   ```typescript
   const items = await supabase
     .from("items")
     .select("*")
     .limit(100);
   // Then fetch prices in parallel
   await Promise.all(items.map(i => getFullPriceData(...)));
   ```

3. **Lazy load price charts**: Show summary first, chart on demand
   ```typescript
   <PriceDisplay mode="compact" showChart={false} />
   // Then toggle showChart={true} on user interaction
   ```

4. **Limit realtime subscriptions**: Only subscribe to items in viewport
   ```typescript
   // Use intersection observer before calling usePriceUpdates
   const ref = useRef(null);
   const [isVisible, setIsVisible] = useState(false);
   // Only subscribe when visible
   const { price } = usePriceUpdates(isVisible ? itemId : undefined);
   ```

## Testing

```typescript
// In your test file
import { getFullPriceData, getConditionMultiplier } from "@/services/pricing";

describe("Price Engine", () => {
  it("fetches Pokemon card pricing", async () => {
    const result = await getFullPriceData(
      "pokemon",
      "Charizard",
      { set_name: "Base Set", card_number: "4/102" }
    );
    expect(result.retailPrice).toBeGreaterThan(0);
    expect(result.source).toBe("tcgplayer");
  });

  it("applies condition multipliers", () => {
    expect(getConditionMultiplier("mint")).toBe(1.5);
    expect(getConditionMultiplier("good")).toBe(0.6);
  });

  it("calculates resell spread correctly", async () => {
    const result = await getFullPriceData("pokemon", "Charizard");
    if (result.retailPrice) {
      expect(result.resellPrice).toBeLessThan(result.retailPrice);
      expect(result.resellSpread).toBeGreaterThan(0.6);
    }
  });
});
```

## Troubleshooting Integration

**Issue**: Prices not updating in component
- Check that `usePriceUpdates` is being called with a valid itemId
- Verify Supabase realtime is enabled in dashboard
- Check browser console for subscription errors

**Issue**: Form price preview is slow
- Add debouncing to title input:
  ```typescript
  const [debouncedTitle, setDebouncedTitle] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTitle(title), 500);
    return () => clearTimeout(timer);
  }, [title]);
  ```

**Issue**: Portfolio calculation is wrong
- Make sure you're using `avgPrice` or `minPrice` from price_snapshots, not estimated_value
- The hook returns current price; item.estimated_value might be stale

**Issue**: Cron job not running
- Check that your platform supports scheduled functions (Vercel, AWS Lambda, etc.)
- Verify `CRON_SECRET` matches in environment variables
- Test manually with curl to verify endpoint works

## Next Steps

1. Deploy code changes
2. Configure cron job in your platform
3. Update item creation/edit forms to use price preview
4. Replace collection views with PriceDisplay component
5. Set up admin pricing dashboard
6. Monitor cron logs in first week
7. Adjust batch size if hitting rate limits
8. Gather user feedback on pricing accuracy
