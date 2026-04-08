# Price Engine Quick Reference

## Files Changed/Created

| File | Type | Purpose |
|------|------|---------|
| `src/services/pricing.ts` | Updated | Main pricing service with retail + resell values |
| `src/app/api/cron/prices/route.ts` | Updated | Price update cron job (6-hour intervals) |
| `src/hooks/usePriceUpdates.ts` | New | React hook for realtime price subscriptions |
| `src/components/pricing/PriceDisplay.tsx` | New | Price display component with condition selector |

## Key Types

```typescript
// Main result type
ResellPriceResult {
  retailPrice: number | null;        // MSRP/market value
  resellPrice: number | null;        // What collector gets selling
  resellLow: number | null;          // 50% of retail
  resellHigh: number | null;         // 95% of retail
  resellSpread: number | null;       // resellPrice / retailPrice
  source: string;                    // API source
  updatedAt: string | null;          // Last API fetch
  breakdown: PriceBreakdown[];       // Variant details
  conditionMultiplier: number;       // 1.0 = raw, 1.5 = mint
  confidence: "high" | "medium" | "low";
}
```

## Public APIs

### getFullPriceData()
```typescript
const result = await getFullPriceData(
  category,        // "pokemon", "sports_cards", "hot_wheels", "funko", etc.
  title,           // Item name/title
  attributes,      // { set_name?, card_number?, rarity?, year?, etc. }
  userEstimate,    // Fallback price
  condition        // "raw", "mint", "near_mint", "9", "8.5", etc.
);
```

### getConditionMultiplier()
```typescript
const mult = getConditionMultiplier("mint");     // 1.5
const mult = getConditionMultiplier("raw");      // 1.0
const mult = getConditionMultiplier("poor");     // 0.2
```

### usePriceUpdates() [Hook]
```typescript
const {
  price,           // Current snapshot { avgPrice, minPrice, maxPrice, ... }
  history,         // 7-day snapshots
  loading,         // boolean
  error,           // string | null
  priceChange,     // dollar amount
  percentChange,   // percentage
  refetch,         // manual refresh fn
} = usePriceUpdates(itemId);
```

### PriceDisplay [Component]
```typescript
<PriceDisplay
  itemId={itemId}
  retailPrice={number}
  resellPrice={number}
  condition="raw"
  mode="full"               // "full" or "compact"
  showChart={true}
  onConditionChange={fn}
/>
```

## Pricing by Category

| Category | Source | Confidence | Notes |
|----------|--------|------------|-------|
| **pokemon** | pokemontcg.io | High | TCGPlayer prices, live updates |
| **yugioh** | YGOPRODeck | High | TCGPlayer/CardMarket/Amazon |
| **one_piece** | optcgapi.com | Medium | Limited data, fallback to estimation |
| **sports_cards** | Estimation | Low | Rarity + sport + year modifiers |
| **hot_wheels** | Estimation | Low | Rarity + color + vintage multipliers |
| **funko** | Estimation | Medium | Chase/exclusive/retired multipliers |
| **other** | User estimate | Medium | Falls back to user-provided value |

## Condition Multipliers

```
Mint/Gem Mint:   1.5x
NM/MT (9.5-9):   1.25-1.3x
Excellent (8-8.5): 0.95-1.1x
Very Good (7-7.5): 0.8-0.85x
Good (6-6.5):    0.6-0.65x
Fair (5):        0.5x
Poor:            0.2x
Raw/Ungraded:    1.0x (baseline)
```

## Resell Value Formula

```
resellPrice = retailPrice × resellRatio × conditionMultiplier

Where resellRatio = {
  0.65              if raw/ungraded
  0.75 + (mult-1)*0.1  if graded
}

Example: $100 raw Charizard
  → $100 × 0.65 × 1.0 = $65 resell
```

## Cron Job Details

**Endpoint**: `GET /api/cron/prices`

**Headers**: `Authorization: Bearer $CRON_SECRET`

**Schedule**: Every 6 hours (configure in your platform)

**Behavior**:
1. Finds items not updated in 24+ hours
2. Fetches fresh prices (batch of 25)
3. Inserts into `price_history` table
4. Updates `price_snapshots` (daily aggregates)
5. Flags items with >5% price change
6. Returns JSON with `pricesUpdated`, `significantChanges`, etc.

**Test Locally**:
```bash
curl -H "Authorization: Bearer test-secret" \
  http://localhost:3000/api/cron/prices
```

## Database Tables

```sql
-- Records every price fetch
price_history (
  id UUID,
  item_id UUID,
  price NUMERIC,
  source TEXT,
  sale_date DATE,
  fetched_at TIMESTAMP
)

-- Daily aggregates (7-day rolling window)
price_snapshots (
  id UUID,
  item_id UUID,
  avg_price NUMERIC,
  min_price NUMERIC,        -- resell estimate
  max_price NUMERIC,        -- high estimate
  sale_count INTEGER,
  trend TEXT,               -- "up", "down", "stable"
  snapshot_date DATE,
  created_at TIMESTAMP,
  UNIQUE(item_id, snapshot_date)
)
```

## Integration Checklist

- [ ] Add `CRON_SECRET` to .env.local
- [ ] Configure cron job schedule in platform
- [ ] Update item creation form to show price preview
- [ ] Replace collection views with PriceDisplay component
- [ ] Test getFullPriceData() for each category
- [ ] Verify condition multipliers work correctly
- [ ] Run cron job once manually to test
- [ ] Check price_history and price_snapshots have data
- [ ] Set up admin dashboard to monitor pricing
- [ ] Document any custom pricing logic you add

## Common Code Patterns

### Get price with condition adjustment
```typescript
const price = await getFullPriceData(
  "pokemon", "Charizard", { set_name: "Base Set" },
  undefined, "mint"
);
console.log(price.retailPrice);  // Mint-adjusted price
```

### Subscribe to realtime updates in React
```typescript
import { usePriceUpdates } from "@/hooks/usePriceUpdates";

export function MyItem({ itemId }) {
  const { price, history, loading } = usePriceUpdates(itemId);
  return <div>{price?.avgPrice}</div>;
}
```

### Display price in UI
```typescript
import PriceDisplay from "@/components/pricing/PriceDisplay";

<PriceDisplay
  itemId={item.id}
  retailPrice={item.estimated_value}
  mode="compact"
/>
```

### Calculate portfolio value
```typescript
const total = items.reduce((sum, item) => {
  const retail = item.estimated_value || 0;
  const resell = retail * 0.65;  // Raw card estimate
  return sum + resell;
}, 0);
```

### Check data quality
```typescript
if (priceData.confidence === "low") {
  console.warn("User should verify this price manually");
}
```

## API Rate Limits

- **pokemontcg.io**: 100 requests/minute (free)
- **YGOPRODeck**: 500 requests/day (free)
- **optcgapi.com**: ~1000 requests/day (free)
- **Cron**: 25 items per run (respects limits)

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Prices are NULL | Check category spelling, verify API is online, check fallback to estimated_value |
| Resell prices seem low | Expected—resell is 60-80% of retail by design |
| Condition multipliers not applying | Ensure condition string matches expected format ("mint", "near_mint", "9", etc.) |
| Cron job 401 error | Check CRON_SECRET in .env matches in code |
| No realtime updates | Verify Supabase realtime enabled, check browser console, confirm itemId is valid |
| Portfolio total incorrect | Make sure you're using price_snapshots data, not stale estimated_value |

## Performance Notes

- Pricing API calls cache for 1 hour
- Cron processes 25 items per run (respects API limits)
- Realtime subscriptions only active for visible items
- Database queries indexed on item_id and date
- Sparkline chart uses CSS grid for efficiency

## Future Enhancements

When eBay API is restored:
1. Add `getEbayPrice()` function
2. Update cron to fetch eBay "sold" listings
3. Add eBay as primary source for sports/vintage
4. Combine with PSA/Grading databases

## Support & Questions

- Review `PRICE_ENGINE.md` for detailed docs
- See `PRICE_ENGINE_INTEGRATION.md` for integration patterns
- Check `src/services/pricing.ts` comments for implementation details
- Test with curl: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/prices`
