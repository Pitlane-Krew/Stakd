# STAKD Real-Time Price Engine

## Overview

The STAKD Price Engine provides comprehensive pricing data for collectibles across multiple categories, offering both **retail values** (MSRP/market value) and **resell values** (what collectors actually receive when selling).

### Key Features

- **Dual-Price Model**: Retail price + Resell price with spread analysis
- **Multi-Category Support**: Pokemon TCG, Yu-Gi-Oh, One Piece, Sports Cards, Hot Wheels, Funko Pops, and more
- **Free API Sources**: No paid subscriptions required
- **Condition-Based Pricing**: Applies condition multipliers to adjust prices (mint, near-mint, excellent, etc.)
- **Real-Time Updates**: Automatic price fetching every 6 hours via cron job
- **Price History**: 7-day snapshots for trend analysis
- **Realtime Subscriptions**: WebSocket updates via Supabase for instant price changes
- **Confidence Scoring**: Tracks data reliability (high/medium/low)

## Architecture

### Files

```
src/services/pricing.ts              # Main pricing service
src/app/api/cron/prices/route.ts     # Price update cron job
src/hooks/usePriceUpdates.ts         # React hook for realtime subscriptions
src/components/pricing/PriceDisplay.tsx  # Price display component
```

### Database Schema

```sql
-- Individual price history records
CREATE TABLE price_history (
  id UUID PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES items(id),
  price NUMERIC(12,2) NOT NULL,
  source TEXT NOT NULL,
  sale_date DATE,
  fetched_at TIMESTAMPTZ DEFAULT now()
);

-- Daily aggregated snapshots
CREATE TABLE price_snapshots (
  id UUID PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES items(id),
  avg_price NUMERIC(12,2),
  min_price NUMERIC(12,2),
  max_price NUMERIC(12,2),
  sale_count INTEGER DEFAULT 0,
  trend TEXT,
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(item_id, snapshot_date)
);
```

## Pricing by Category

### Pokemon TCG

**Source**: pokemontcg.io (TCGPlayer prices)

- Fetches live TCGPlayer market prices
- Supports card variants (holofoil, reverse holofoil, normal)
- Returns low/mid/high price ranges
- **Confidence**: High

**Example**:
```typescript
const price = await getFullPriceData(
  "pokemon",
  "Charizard",
  { set_name: "Base Set", card_number: "4/102" }
);
// Returns: retailPrice: $100, resellPrice: $65, spread: 65%
```

### Yu-Gi-Oh

**Source**: YGOPRODeck (TCGPlayer, CardMarket, Amazon)

- Exact and fuzzy card matching
- Multiple marketplace prices (TCGPlayer > CardMarket > Amazon)
- **Confidence**: High

### One Piece TCG

**Source**: optcgapi.com

- Limited pricing data availability
- Falls back to estimation if APIs unavailable
- **Confidence**: Medium

### Sports Cards

**Source**: Smart estimation algorithm

- Base rarity multipliers (rookie: $15, rare: $8, common: $1)
- Sport popularity bonus (NFL, NBA, MLB, NHL +30%)
- Recent card boost (2020+: +10%)
- **Confidence**: Low

**Example Multipliers**:
- Rookie card, NFL: $15 × 1.3 = $19.50
- Common basketball card: $1 × 1.3 = $1.30

### Hot Wheels

**Source**: Category/rarity-based estimation

- Rarity tiers (Treasure Hunt: $30, Super TH: $100, Common: $2)
- Rare color premium (+40% for gold/silver/pearl)
- First edition bonus (+20%)
- Vintage cars pre-1980s (+250%)
- **Confidence**: Low

**Example**:
- Super Treasure Hunt black: $100 × 1.4 = $140

### Funko Pops

**Source**: Estimation + free hobbydb APIs

- Standard Pop base: $14.99
- Chase variant: ×3.5 ($52.47)
- Exclusive bonus: ×1.8 ($26.98)
- Retired multiplier: ×2.0
- Popular franchise bonus: ×1.3
- **Confidence**: Medium

### Other Categories

Uses user-provided estimates with fallback to category defaults.

## Condition Multipliers

Prices adjust based on condition. Use `getConditionMultiplier(condition)`:

```typescript
const multiplier = getConditionMultiplier("mint");  // 1.5
const multiplier = getConditionMultiplier("near_mint");  // 1.25
const multiplier = getConditionMultiplier("excellent");  // 0.95
const multiplier = getConditionMultiplier("good");  // 0.6
const multiplier = getConditionMultiplier("poor");  // 0.2
```

**Full List**:
- **Graded (High to Low)**: Gem Mint 9.5 (1.5), 9 (1.3), 8.5 (1.15), 8 (1.1), 7.5 (0.9), 7 (0.85), 6.5 (0.7), 6 (0.65), 5 (0.5)
- **Raw (High to Low)**: Mint (1.5), NM/MT (1.25), Excellent (0.95), Very Good (0.8), Good (0.6), Fair (0.4), Poor (0.2)

## Resell Value Calculation

Resell values follow this formula:

```
resellPrice = retailPrice × resellRatio × conditionMultiplier

resellRatio = {
  0.65  if raw/ungraded
  0.75 + (conditionMultiplier - 1.0) * 0.1  if graded
}
```

**Examples**:
- Raw card: $100 retail → $65 resell (65%)
- Graded 9 card: $100 retail × 1.3 × (0.75 + 0.3 × 0.1) → $104.50 resell
- Mint card: $100 retail × 1.5 × 0.75 → $112.50 resell

## API Reference

### getFullPriceData()

```typescript
export async function getFullPriceData(
  category: string,
  title: string,
  attributes?: Record<string, unknown>,
  userEstimate?: number | null,
  condition?: string
): Promise<ResellPriceResult>
```

**Parameters**:
- `category`: Item category (pokemon, sports_cards, hot_wheels, funko, yugioh, one_piece, etc.)
- `title`: Item name/title
- `attributes`: Item-specific attributes (set_name, card_number, rarity, etc.)
- `userEstimate`: User-provided price estimate (fallback)
- `condition`: Condition grade (raw, near_mint, mint, 9, 8.5, etc.)

**Returns**:
```typescript
{
  retailPrice: number | null;           // Market/MSRP value
  resellPrice: number | null;           // What collector gets selling
  resellLow: number | null;             // 50% of retail (min resale)
  resellHigh: number | null;            // 95% of retail (max resale)
  resellSpread: number | null;          // resellPrice / retailPrice
  source: string;                        // API source (tcgplayer, estimation, etc.)
  updatedAt: string | null;             // Last API update
  breakdown: PriceBreakdown[];          // Detailed price variants
  conditionMultiplier: number;          // Applied condition factor
  confidence: "high" | "medium" | "low"; // Data reliability
}
```

### getMarketPrice() [Legacy]

```typescript
export async function getMarketPrice(
  category: string,
  title: string,
  attributes?: Record<string, unknown>,
  userEstimate?: number | null
): Promise</* legacy format */>
```

Backward-compatible API. Returns only retail price data.

### getConditionMultiplier()

```typescript
export function getConditionMultiplier(condition?: string): number
```

Returns the numeric multiplier for a condition grade.

### getTrendDirection()

```typescript
export function getTrendDirection(
  currentPrice: number,
  previousPrice: number | null
): "up" | "down" | "stable"
```

Classifies price movement (>5% change = direction).

## Cron Job: Price Updates

**Endpoint**: `GET /api/cron/prices`

Runs every 6 hours (configure via your cron service):

```bash
# Example: every 6 hours via cron
0 */6 * * * curl -H "Authorization: Bearer $CRON_SECRET" https://your-app/api/cron/prices
```

**What it does**:
1. Finds items not updated in 24+ hours
2. Fetches fresh prices from APIs/estimation
3. Stores results in `price_history` table
4. Creates/updates `price_snapshots` for today
5. Flags items with >5% price change
6. Processes in batches of 25 (rate limit safe)

**Response**:
```json
{
  "success": true,
  "itemsProcessed": 25,
  "pricesUpdated": 23,
  "significantChanges": 2,
  "duration": 1234,
  "results": [
    {
      "itemId": "uuid",
      "priceUpdated": true,
      "newPrice": 45.99,
      "previousPrice": 42.00,
      "trend": "up"
    }
  ]
}
```

## React Hooks

### usePriceUpdates()

Subscribe to real-time price updates for an item:

```typescript
import { usePriceUpdates } from "@/hooks/usePriceUpdates";

export function MyComponent() {
  const {
    price,           // Current snapshot
    history,         // 7-day snapshots
    loading,         // Loading state
    error,           // Error message
    priceChange,     // Dollar change
    percentChange,   // Percentage change
    refetch,         // Manual refresh
  } = usePriceUpdates(itemId);

  return (
    <div>
      {price && <div>Price: ${price.avgPrice}</div>}
      {priceChange && <div>Change: {priceChange > 0 ? "↑" : "↓"}</div>}
    </div>
  );
}
```

**Features**:
- Auto-loads current + 7-day history
- Subscribes to `price_snapshots` table updates
- Auto-refetches on `price_history` inserts
- Unsubscribes on cleanup

## Components

### PriceDisplay

Complete price display component with condition selector:

```typescript
import PriceDisplay from "@/components/pricing/PriceDisplay";

export function ItemCard() {
  return (
    <PriceDisplay
      itemId={item.id}
      retailPrice={item.estimated_value}
      condition="raw"
      onConditionChange={(cond) => console.log(cond)}
      mode="full"
      showChart={true}
    />
  );
}
```

**Props**:
- `itemId`: (required) Item UUID
- `retailPrice`: Fallback retail price
- `resellPrice`: Fallback resell price
- `condition`: Default condition ("raw")
- `onConditionChange`: Callback when user changes condition
- `mode`: "compact" (single line) or "full" (detailed)
- `showChart`: Show 7-day sparkline
- `className`: CSS class

**Features**:
- Condition selector (8 options)
- Retail + Resell price cards
- Buy-sell spread analysis
- 7-day price trend
- Sparkline chart
- Loading/error states
- Real-time updates

## Integration Examples

### Update Item Pricing on Save

```typescript
import { getFullPriceData } from "@/services/pricing";

async function saveItem(item: Item) {
  // Get fresh pricing
  const price = await getFullPriceData(
    item.category,
    item.title,
    item.attributes,
    item.estimated_value,
    item.condition
  );

  // Save item with updated prices
  await supabase.from("items").update({
    estimated_value: price.retailPrice,
    metadata: {
      ...item.metadata,
      resellValue: price.resellPrice,
      priceSource: price.source,
      priceFetched: new Date().toISOString(),
    },
  }).eq("id", item.id);
}
```

### Display Prices in List

```typescript
export function ItemList({ items }: { items: Item[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="p-4 border rounded">
          <h3>{item.title}</h3>
          <PriceDisplay
            itemId={item.id}
            retailPrice={item.estimated_value}
            mode="compact"
          />
        </div>
      ))}
    </div>
  );
}
```

### Create Price Alert

```typescript
async function checkPriceAlert(itemId: string, threshold: number) {
  const { price } = usePriceUpdates(itemId);

  if (price && price.avgPrice > threshold) {
    // Send alert notification
    await notifyUser(`${itemId} now worth $${price.avgPrice}`);
  }
}
```

## Performance Considerations

1. **Caching**: APIs use 1-hour cache (`next: { revalidate: 3600 }`)
2. **Batch Processing**: Cron processes 25 items per run
3. **Rate Limiting**: Free APIs have limits; batch sizes respect these
4. **Database**: Price history indexed on item_id and date
5. **Realtime**: Supabase subscriptions are efficient; limit to active items

## Error Handling

All functions return null values gracefully:

```typescript
const price = await getFullPriceData("invalid_category", "Test");
if (!price.retailPrice) {
  console.log("No pricing available");
}
```

Cron job continues on per-item failures, returning detailed error logs:

```json
{
  "itemId": "uuid",
  "priceUpdated": false,
  "error": "API timeout"
}
```

## Troubleshooting

**Q: Prices not updating?**
- Check that cron job is running
- Verify `CRON_SECRET` environment variable
- Check Supabase real-time is enabled
- Review browser console for subscription errors

**Q: Getting "No pricing data" for valid items?**
- Ensure category matches (pokemon, sports_cards, hot_wheels, etc.)
- For TCG items, verify card_name or set_name attributes
- Check API source status (pokemontcg.io, ygoprodeck.com)

**Q: Resell prices seem low?**
- This is intentional—resell is 60-80% of retail
- Condition multipliers may reduce further
- User-supplied estimates have medium confidence

**Q: Can I use paid APIs?**
- Yes—modify `getSportsCardPrice()` or others to call your API
- Add API key handling to .env.local
- Update confidence scoring for paid sources

## Future Enhancements

- [ ] eBay API integration (once developer account approved)
- [ ] PSA/Grading database integration
- [ ] Machine learning price predictions
- [ ] Multi-currency support
- [ ] Price alerts via email/push
- [ ] Bulk import from CSV
- [ ] Historical trend analysis (30/90/365 day)
- [ ] Market sentiment scoring
- [ ] Comparable sales matching

## Testing

```typescript
// Manual testing in browser console
const price = await fetch("/api/cron/prices", {
  headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` }
}).then(r => r.json());

// Test pricing service
import { getFullPriceData } from "@/services/pricing";
const p = await getFullPriceData("pokemon", "Charizard", { set_name: "Base Set" });
console.log(p);
```

## Support

For questions or issues:
1. Check logs in Supabase dashboard
2. Review API source status pages
3. Verify item attributes are populated
4. Check CRON_SECRET in environment variables
