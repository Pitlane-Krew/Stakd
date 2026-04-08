# Price Engine Extensibility Guide

This guide shows how to extend the price engine for custom categories, APIs, or special pricing logic.

## Adding a New Category Pricing Function

### Example: Vintage Toy Pricing

```typescript
// Add to src/services/pricing.ts

async function getVintageToyPrice(
  name: string,
  attributes: Record<string, unknown> = {}
): Promise<Omit<ResellPriceResult, "resellPrice" | "resellLow" | "resellHigh" | "resellSpread">> {
  try {
    const brand = (attributes.brand as string) || "";
    const decade = (attributes.decade as string) || "";
    const rarity = (attributes.rarity as string) || "common";
    const hasOriginalBox = (attributes.has_original_box as unknown) === true;
    const isMIB = (attributes.mint_in_box as unknown) === true; // Mint In Box

    // Base price by rarity
    const rarityBase: Record<string, number> = {
      rare_prototype: 500,
      rare_variant: 200,
      rare: 50,
      uncommon: 15,
      common: 5,
    };

    let basePrice = rarityBase[rarity.toLowerCase()] ?? 10;

    // Decade multiplier (older = more valuable)
    const decadeMult: Record<string, number> = {
      "1950s": 3.0,
      "1960s": 2.5,
      "1970s": 2.0,
      "1980s": 1.5,
      "1990s": 1.0,
      "2000s": 0.8,
    };
    basePrice *= decadeMult[decade] ?? 1.0;

    // Original packaging adds significant value
    if (hasOriginalBox) basePrice *= 1.5;
    if (isMIB) basePrice *= 2.0;

    // Brand premium
    const premiumBrands = ["steiff", "lego", "barbie", "gi-joe", "star-wars"];
    if (premiumBrands.some((b) => brand.toLowerCase().includes(b))) {
      basePrice *= 1.4;
    }

    return {
      retailPrice: parseFloat(basePrice.toFixed(2)),
      source: "estimation",
      updatedAt: null,
      breakdown: [
        {
          label: "Vintage Toy Estimation",
          market: parseFloat(basePrice.toFixed(2)),
          low: Math.max(1, parseFloat((basePrice * 0.4).toFixed(2))),
          mid: null,
          high: parseFloat((basePrice * 2.0).toFixed(2)),
        },
      ],
      conditionMultiplier: 1.0,
      confidence: "low",
    };
  } catch {
    return emptyPriceBase();
  }
}
```

### Update getFullPriceData() to use it

```typescript
export async function getFullPriceData(
  category: string,
  title: string,
  attributes: Record<string, unknown> = {},
  userEstimate?: number | null,
  condition?: string
): Promise<ResellPriceResult> {
  // ... existing code ...

  let priceBase: Omit<ResellPriceResult, "resellPrice" | "resellLow" | "resellHigh" | "resellSpread">;

  if (category === "pokemon") {
    // ... existing pokemon logic ...
  } else if (category === "vintage_toys") {  // NEW
    priceBase = await getVintageToyPrice(cardName, attributes);
  } else if (category === "sports_cards") {
    // ... existing sports cards logic ...
  }
  // ... rest of function ...
}
```

## Integrating a Paid API

### Example: Using Graded Card Database (PSA/Grading)

```typescript
// New file: src/services/pricing-graded.ts

export async function getGradedCardPrice(
  cardName: string,
  grade: number,
  apiKey: string
): Promise<Omit<ResellPriceResult, "resellPrice" | "resellLow" | "resellHigh" | "resellSpread">> {
  try {
    // Example: PSAdb API or custom grading database
    const res = await fetch(
      `https://psadb-api.example.com/cards?name=${encodeURIComponent(cardName)}&grade=${grade}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) return emptyPriceBase();

    const data = await res.json();
    const card = data.cards?.[0];

    if (!card) return emptyPriceBase();

    return {
      retailPrice: card.avg_sale_price,
      source: "psadb",
      updatedAt: card.last_updated,
      breakdown: [
        {
          label: `PSA ${grade}`,
          market: card.avg_sale_price,
          low: card.min_sale_price,
          mid: card.median_price,
          high: card.max_sale_price,
        },
      ],
      conditionMultiplier: 1.0,
      confidence: "high",
    };
  } catch {
    return emptyPriceBase();
  }
}
```

### Use in getFullPriceData()

```typescript
export async function getFullPriceData(
  category: string,
  title: string,
  attributes: Record<string, unknown> = {},
  userEstimate?: number | null,
  condition?: string
): Promise<ResellPriceResult> {
  const cardName = (attributes.card_name as string) || title;
  const gradeValue = attributes.grade as number | undefined;
  const conditionMultiplier = getConditionMultiplier(condition);

  let priceBase: Omit<ResellPriceResult, "resellPrice" | "resellLow" | "resellHigh" | "resellSpread">;

  // Check for graded cards first
  if (category === "pokemon" && gradeValue && process.env.PSADB_API_KEY) {
    try {
      priceBase = await getGradedCardPrice(
        cardName,
        gradeValue,
        process.env.PSADB_API_KEY
      );
      if (priceBase.retailPrice) {
        // Skip regular pricing, use graded data
        return buildFullResult(priceBase, conditionMultiplier);
      }
    } catch {
      // Fall through to regular pricing
    }
  }

  // ... rest of existing logic ...
}

function buildFullResult(
  priceBase: Omit<ResellPriceResult, "resellPrice" | "resellLow" | "resellHigh" | "resellSpread">,
  conditionMultiplier: number
): ResellPriceResult {
  // ... existing resell calculation logic ...
}
```

## Custom Estimation Formulas

### Example: Sneaker Pricing

```typescript
async function getSneakerPrice(
  name: string,
  attributes: Record<string, unknown> = {}
): Promise<Omit<ResellPriceResult, "resellPrice" | "resellLow" | "resellHigh" | "resellSpread">> {
  const brand = (attributes.brand as string) || "";
  const model = (attributes.model as string) || "";
  const releaseYear = (attributes.release_year as string) || "";
  const releasePrice = (attributes.release_price as number) || 100;
  const colorway = (attributes.colorway as string) || "";
  const condition = (attributes.condition as string) || "worn";

  // Start with release price
  let basePrice = releasePrice;

  // Scarcity multiplier
  const sold = (attributes.sold_units as number) || 10000;
  const scarcityRatio = Math.max(0.5, 50000 / sold);
  basePrice *= scarcityRatio;

  // Hype multiplier (newer releases more hyped)
  const yearsSinceRelease = new Date().getFullYear() - parseInt(releaseYear);
  const hypeMultiplier = Math.max(0.3, 2.0 - yearsSinceRelease * 0.15);
  basePrice *= hypeMultiplier;

  // Condition discount
  const conditionDiscount: Record<string, number> = {
    deadstock: 1.0,
    pristine: 0.95,
    excellent: 0.85,
    good: 0.7,
    worn: 0.5,
    damaged: 0.2,
  };
  basePrice *= conditionDiscount[condition.toLowerCase()] ?? 0.5;

  // Celebrity/designer boost
  const designerBrands = ["jordan", "yeezy", "travis scott", "dior", "off-white"];
  if (designerBrands.some((b) => brand.toLowerCase().includes(b))) {
    basePrice *= 1.5;
  }

  return {
    retailPrice: Math.max(30, parseFloat(basePrice.toFixed(2))),
    source: "estimation",
    updatedAt: null,
    breakdown: [
      {
        label: "Sneaker Resale Estimation",
        market: Math.max(30, parseFloat(basePrice.toFixed(2))),
        low: Math.max(10, parseFloat((basePrice * 0.4).toFixed(2))),
        mid: null,
        high: parseFloat((basePrice * 2.0).toFixed(2)),
      },
    ],
    conditionMultiplier: 1.0,
    confidence: "low",
  };
}
```

## Override for Specific Items

### Example: High-value items need manual pricing

```typescript
// In src/services/pricing.ts

const MANUAL_PRICES: Record<string, number> = {
  "pokemon:charizard:base-set:4/102": 500,  // Famous card
  "pokemon:blastoise:base-set:2/102": 450,  // Another iconic card
};

export async function getFullPriceData(
  category: string,
  title: string,
  attributes: Record<string, unknown> = {},
  userEstimate?: number | null,
  condition?: string
): Promise<ResellPriceResult> {
  // Check manual overrides first
  const cardId = `${category}:${title}:${attributes.set_name}:${attributes.card_number}`;
  if (MANUAL_PRICES[cardId]) {
    return {
      retailPrice: MANUAL_PRICES[cardId],
      resellPrice: MANUAL_PRICES[cardId] * 0.75,
      // ... rest of result ...
    };
  }

  // ... normal pricing logic ...
}
```

## Adding Market Sentiment Scoring

```typescript
// New file: src/services/price-sentiment.ts

export async function getPriceSentiment(
  itemId: string,
  itemCategory: string
): Promise<{
  trend: "rising" | "stable" | "falling";
  momentum: "strong" | "moderate" | "weak";
  percentChange7d: number;
  percentChange30d: number;
}> {
  const supabase = await createServiceRoleClient();

  // Get 7-day and 30-day history
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: snapshots } = await supabase
    .from("price_snapshots")
    .select("avg_price, snapshot_date")
    .eq("item_id", itemId)
    .gte("snapshot_date", thirtyDaysAgo.toISOString().split("T")[0])
    .order("snapshot_date", { ascending: true });

  if (!snapshots || snapshots.length < 2) {
    return {
      trend: "stable",
      momentum: "weak",
      percentChange7d: 0,
      percentChange30d: 0,
    };
  }

  const newest = snapshots[snapshots.length - 1];
  const week7 = snapshots.find(
    (s) => new Date(s.snapshot_date) >= sevenDaysAgo
  ) || snapshots[0];
  const month30 = snapshots[0];

  const pctChange7d =
    ((newest.avg_price - week7.avg_price) / week7.avg_price) * 100;
  const pctChange30d =
    ((newest.avg_price - month30.avg_price) / month30.avg_price) * 100;

  const trend = pctChange30d > 5 ? "rising" : pctChange30d < -5 ? "falling" : "stable";
  const momentum =
    Math.abs(pctChange7d) > 10 ? "strong"
      : Math.abs(pctChange7d) > 3 ? "moderate"
      : "weak";

  return {
    trend,
    momentum,
    percentChange7d: pctChange7d,
    percentChange30d: pctChange30d,
  };
}
```

## Custom Component for Specialized Pricing

```typescript
// New file: src/components/pricing/GradedCardPriceDisplay.tsx

"use client";

import PriceDisplay from "./PriceDisplay";
import { useEffect, useState } from "react";
import { getGradedCardPrice } from "@/services/pricing-graded";

interface GradedCardPriceDisplayProps {
  itemId: string;
  cardName: string;
  psaGrade: number;
}

export default function GradedCardPriceDisplay({
  itemId,
  cardName,
  psaGrade,
}: GradedCardPriceDisplayProps) {
  const [gradedPrice, setGradedPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PSADB_API_KEY) return;

    setLoading(true);
    getGradedCardPrice(
      cardName,
      psaGrade,
      process.env.NEXT_PUBLIC_PSADB_API_KEY
    )
      .then((result) => setGradedPrice(result.retailPrice))
      .finally(() => setLoading(false));
  }, [cardName, psaGrade]);

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="text-sm text-gray-600">PSA Grade {psaGrade} Price</div>
        {gradedPrice ? (
          <div className="text-2xl font-bold text-purple-600">
            ${gradedPrice.toFixed(2)}
          </div>
        ) : loading ? (
          <div className="text-sm text-gray-500">Fetching graded price...</div>
        ) : (
          <div className="text-sm text-gray-500">No graded price data</div>
        )}
      </div>

      <PriceDisplay
        itemId={itemId}
        retailPrice={gradedPrice}
        mode="full"
        showChart={true}
      />
    </div>
  );
}
```

## Testing Custom Pricing

```typescript
// src/services/__tests__/pricing.test.ts

import {
  getFullPriceData,
  getConditionMultiplier,
  getTrendDirection,
} from "@/services/pricing";

describe("Custom Category Pricing", () => {
  it("prices vintage toys with brand premium", async () => {
    const result = await getFullPriceData(
      "vintage_toys",
      "Teddy Bear",
      { brand: "Steiff", decade: "1950s", has_original_box: true },
      undefined,
      "excellent"
    );

    expect(result.retailPrice).toBeGreaterThan(100);
    expect(result.source).toBe("estimation");
  });

  it("applies sneaker scarcity multiplier", async () => {
    const common = await getFullPriceData(
      "sneakers",
      "Air Force 1",
      { brand: "Nike", sold_units: 50000, release_year: "2023" }
    );

    const rare = await getFullPriceData(
      "sneakers",
      "Air Jordan 1",
      { brand: "Jordan", sold_units: 1000, release_year: "2023" }
    );

    expect(rare.retailPrice).toBeGreaterThan(common.retailPrice ?? 0);
  });

  it("overrides with manual pricing for famous cards", async () => {
    const result = await getFullPriceData(
      "pokemon",
      "Charizard",
      { set_name: "Base Set", card_number: "4/102" }
    );

    expect(result.retailPrice).toBe(500);
  });
});
```

## Environment Variables for Extended Pricing

```env
# .env.local
PSADB_API_KEY=your_api_key_here
NEXT_PUBLIC_PSADB_API_KEY=your_public_key_here
EBAY_API_KEY=when_account_approved
GOLDIN_API_KEY=auction_house_api_key
COMC_API_KEY=card_marketplace_key
```

## Guidelines for Extension

1. **Maintain backward compatibility**: Don't break existing categories
2. **Use consistent return types**: Always return ResellPriceResult
3. **Document assumptions**: Add comments explaining multipliers
4. **Test edge cases**: What if attributes are missing?
5. **Cache appropriately**: Use `next: { revalidate: ... }` for API calls
6. **Handle errors gracefully**: Return emptyPriceBase() on failure
7. **Confidence scoring**: Mark low-confidence estimations appropriately
8. **Rate limiting**: Batch external API calls in cron job
9. **User overrides**: Allow manual price entry as fallback
10. **Monitor performance**: Log API latencies and error rates

## Integration Workflow

1. Create new pricing function following the pattern
2. Add to getFullPriceData() routing logic
3. Update hasLivePricing() if it supports realtime
4. Add documentation to PRICE_ENGINE.md
5. Create tests in __tests__ folder
6. Update quick reference guide
7. Deploy and monitor cron job logs
8. Gather user feedback on pricing accuracy
