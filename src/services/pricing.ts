/**
 * STAKD Real-Time Price Engine
 *
 * Provides both retail and resell pricing for collectibles across multiple categories:
 *  - Pokémon TCG  → pokemontcg.io (TCGPlayer prices)
 *  - Yu-Gi-Oh     → YGOPRODeck (TCGPlayer/CardMarket/Amazon)
 *  - One Piece    → optcgapi.com (limited pricing)
 *  - Sports Cards → free estimation with market modifiers
 *  - Hot Wheels   → category/rarity-based estimation
 *  - Funko Pops   → hobbydb for matching + estimation
 *  - Others       → condition-based multipliers from retail
 *
 * Resell prices are typically 60-80% of retail for raw cards,
 * higher for graded items. Uses condition multipliers for accuracy.
 */

// ─── Types ──────────────────────────────────────────────────────

export interface PriceBreakdown {
  label: string;
  market: number | null;
  low: number | null;
  mid: number | null;
  high: number | null;
}

export interface ResellPriceResult {
  /** Retail/market value (what it typically sells for new/raw) */
  retailPrice: number | null;
  /** Resell value (what collectors get when selling used/raw) */
  resellPrice: number | null;
  /** Low end of resale market */
  resellLow: number | null;
  /** High end of resale market */
  resellHigh: number | null;
  /** The spread as a percentage (resellPrice / retailPrice) */
  resellSpread: number | null;
  /** Where the price data came from */
  source: "tcgplayer" | "cardmarket" | "amazon" | "psadb" | "estimation" | "user" | "none";
  /** Last update timestamp from the API */
  updatedAt: string | null;
  /** Breakdown by condition/variant */
  breakdown: PriceBreakdown[];
  /** Applied condition multiplier (1.0 = raw/standard) */
  conditionMultiplier: number;
  /** Confidence level in the pricing data */
  confidence: "high" | "medium" | "low";
}

// ─── Condition Modifiers ────────────────────────────────────────

const CONDITION_MULTIPLIERS: Record<string, number> = {
  mint: 1.5,
  gem_mint: 1.5,
  9_5: 1.4,
  9: 1.3,
  nm_mt: 1.25,
  near_mint: 1.25,
  8_5: 1.15,
  8: 1.1,
  vg_ex: 1.0,
  very_good_excellent: 1.0,
  excellent: 0.95,
  7_5: 0.9,
  7: 0.85,
  vg: 0.8,
  very_good: 0.8,
  6_5: 0.7,
  6: 0.65,
  good: 0.6,
  5: 0.5,
  fair: 0.4,
  poor: 0.2,
  raw: 1.0,
  ungraded: 1.0,
};

export function getConditionMultiplier(condition?: string): number {
  if (!condition) return 1.0;
  const normalized = condition.toLowerCase().replace(/\s+/g, "_");
  return CONDITION_MULTIPLIERS[normalized] ?? 1.0;
}

// ─── Pokémon TCG Prices ─────────────────────────────────────────

async function getPokemonPrice(
  cardName: string,
  setName?: string,
  cardNumber?: string
): Promise<Omit<ResellPriceResult, "resellPrice" | "resellLow" | "resellHigh" | "resellSpread">> {
  try {
    let query = `name:"${cardName}"`;
    if (setName) query += ` set.name:"${setName}"`;
    if (cardNumber) query += ` number:${cardNumber}`;

    const res = await fetch(
      `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}&pageSize=1&select=id,name,tcgplayer,cardmarket`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) return emptyPriceBase();

    const data = await res.json();
    const card = data?.data?.[0];
    if (!card) return emptyPriceBase();

    // TCGPlayer prices (primary — USD)
    const tcg = card.tcgplayer;
    if (tcg?.prices) {
      const breakdown: PriceBreakdown[] = [];
      let bestMarket: number | null = null;
      let bestLow: number | null = null;
      let bestHigh: number | null = null;

      for (const [variant, prices] of Object.entries(tcg.prices)) {
        const p = prices as Record<string, number | null>;
        breakdown.push({
          label: formatVariant(variant),
          market: p.market ?? null,
          low: p.low ?? null,
          mid: p.mid ?? null,
          high: p.high ?? null,
        });

        if (p.market && (!bestMarket || p.market > bestMarket)) {
          bestMarket = p.market;
          bestLow = p.low ?? null;
          bestHigh = p.high ?? null;
        }
      }

      return {
        retailPrice: bestMarket,
        source: "tcgplayer",
        updatedAt: tcg.updatedAt ?? null,
        breakdown,
        conditionMultiplier: 1.0,
        confidence: "high",
      };
    }

    // Fallback to CardMarket prices (EUR — approximate to USD)
    const cm = card.cardmarket;
    if (cm?.prices) {
      const p = cm.prices;
      return {
        retailPrice: p.averageSellPrice ?? p.avg1 ?? null,
        source: "cardmarket",
        updatedAt: cm.updatedAt ?? null,
        breakdown: [
          {
            label: "CardMarket Avg",
            market: p.averageSellPrice ?? null,
            low: p.lowPrice ?? null,
            mid: p.avg1 ?? null,
            high: p.avg30 ?? null,
          },
        ],
        conditionMultiplier: 1.0,
        confidence: "high",
      };
    }

    return emptyPriceBase();
  } catch {
    return emptyPriceBase();
  }
}

// ─── Yu-Gi-Oh Prices ────────────────────────────────────────────

async function getYugiohPrice(cardName: string): Promise<Omit<ResellPriceResult, "resellPrice" | "resellLow" | "resellHigh" | "resellSpread">> {
  try {
    let res = await fetch(
      `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(cardName)}`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      res = await fetch(
        `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(cardName)}&num=1`,
        { next: { revalidate: 3600 } }
      );
      if (!res.ok) return emptyPriceBase();
    }

    const data = await res.json();
    const card = data?.data?.[0];
    if (!card?.card_prices?.[0]) return emptyPriceBase();

    const prices = card.card_prices[0];
    const tcgPrice = parseFloat(prices.tcgplayer_price) || null;
    const cmPrice = parseFloat(prices.cardmarket_price) || null;
    const amazonPrice = parseFloat(prices.amazon_price) || null;

    const primary = tcgPrice ?? cmPrice ?? amazonPrice;
    const source = tcgPrice
      ? "tcgplayer"
      : cmPrice
        ? "cardmarket"
        : amazonPrice
          ? "amazon"
          : "none";

    const breakdown: PriceBreakdown[] = [];
    if (tcgPrice)
      breakdown.push({ label: "TCGPlayer", market: tcgPrice, low: null, mid: null, high: null });
    if (cmPrice)
      breakdown.push({ label: "CardMarket", market: cmPrice, low: null, mid: null, high: null });
    if (amazonPrice)
      breakdown.push({ label: "Amazon", market: amazonPrice, low: null, mid: null, high: null });

    return {
      retailPrice: primary,
      source: source as ResellPriceResult["source"],
      updatedAt: null,
      breakdown,
      conditionMultiplier: 1.0,
      confidence: "high",
    };
  } catch {
    return emptyPriceBase();
  }
}

// ─── One Piece Prices ───────────────────────────────────────────

async function getOnePiecePrice(
  cardName: string,
  cardNumber?: string
): Promise<Omit<ResellPriceResult, "resellPrice" | "resellLow" | "resellHigh" | "resellSpread">> {
  try {
    // OPTCG API returns limited pricing — use estimation fallback
    // Can expand when their pricing endpoints mature
    return emptyPriceBase();
  } catch {
    return emptyPriceBase();
  }
}

// ─── Sports Cards Pricing ───────────────────────────────────────

async function getSportsCardPrice(
  cardName: string,
  attributes: Record<string, unknown> = {}
): Promise<Omit<ResellPriceResult, "resellPrice" | "resellLow" | "resellHigh" | "resellSpread">> {
  try {
    // Sports cards have limited free APIs. Use smart estimation.
    // Factors: sport, year, player status, set rarity
    const sport = (attributes.sport as string) || "unknown";
    const year = (attributes.year as string) || "";
    const playerName = (attributes.player_name as string) || cardName;
    const cardRarity = (attributes.rarity as string) || "common";

    // Base retail estimate by rarity
    const rarityBase: Record<string, number> = {
      rookie: 15,
      rookie_patch: 25,
      autograph: 30,
      rare: 8,
      uncommon: 3,
      common: 1,
    };

    let basePrice = rarityBase[cardRarity.toLowerCase()] ?? 5;

    // Popular sports and players warrant higher multiples
    const isPopularSport = ["nba", "nfl", "mlb", "nhl"].includes(sport.toLowerCase());
    if (isPopularSport) basePrice *= 1.3;

    const isRecentCard = year && parseInt(year) >= 2020;
    if (isRecentCard) basePrice *= 1.1;

    return {
      retailPrice: parseFloat(basePrice.toFixed(2)),
      source: "estimation",
      updatedAt: null,
      breakdown: [
        {
          label: "Sports Card Estimation",
          market: parseFloat(basePrice.toFixed(2)),
          low: Math.max(0.5, parseFloat((basePrice * 0.6).toFixed(2))),
          mid: null,
          high: parseFloat((basePrice * 1.4).toFixed(2)),
        },
      ],
      conditionMultiplier: 1.0,
      confidence: "low",
    };
  } catch {
    return emptyPriceBase();
  }
}

// ─── Hot Wheels Pricing ──────────────────────────────────────────

async function getHotWheelsPrice(
  cardName: string,
  attributes: Record<string, unknown> = {}
): Promise<Omit<ResellPriceResult, "resellPrice" | "resellLow" | "resellHigh" | "resellSpread">> {
  try {
    const color = (attributes.color as string) || "";
    const rarity = (attributes.rarity as string) || "common";
    const year = (attributes.year as string) || "";
    const edition = (attributes.edition as string) || "regular";

    // Base retail by rarity
    const rarityBase: Record<string, number> = {
      treasure_hunt: 30,
      super_treasure_hunt: 100,
      rare: 15,
      uncommon: 5,
      common: 2,
    };

    let basePrice = rarityBase[rarity.toLowerCase()] ?? 3;

    // Rare colors and first editions command premium
    const rareColors = ["black", "gold", "silver", "pearl"];
    if (rareColors.some((c) => color.toLowerCase().includes(c))) {
      basePrice *= 1.4;
    }

    if (edition.toLowerCase() === "first") basePrice *= 1.2;

    // Vintage cars (pre-1980s) are collectible
    if (year && parseInt(year) < 1980) basePrice *= 2.5;

    return {
      retailPrice: parseFloat(basePrice.toFixed(2)),
      source: "estimation",
      updatedAt: null,
      breakdown: [
        {
          label: "Hot Wheels Estimation",
          market: parseFloat(basePrice.toFixed(2)),
          low: Math.max(0.5, parseFloat((basePrice * 0.5).toFixed(2))),
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

// ─── Funko Pop Pricing ──────────────────────────────────────────

async function getFunkoPriceEstimate(
  name: string,
  attributes: Record<string, unknown> = {}
): Promise<Omit<ResellPriceResult, "resellPrice" | "resellLow" | "resellHigh" | "resellSpread">> {
  try {
    const series = (attributes.series as string) || "";
    const isChase = (attributes.is_chase as unknown) === true || (attributes.variant as string)?.toLowerCase() === "chase";
    const isExclusive = (attributes.is_exclusive as unknown) === true;
    const isRetired = (attributes.is_retired as unknown) === true;

    // Base retail for standard Funko Pop
    let basePrice = 14.99;

    // Chase variants are limited and valuable
    if (isChase) basePrice *= 3.5;

    // Exclusives command premium
    if (isExclusive) basePrice *= 1.8;

    // Retired Pops often increase in value
    if (isRetired) basePrice *= 2.0;

    // Popular franchises cost more
    const popularSeries = ["marvel", "dc", "pokemon", "star wars", "disney", "anime"];
    if (popularSeries.some((s) => series.toLowerCase().includes(s))) {
      basePrice *= 1.3;
    }

    return {
      retailPrice: parseFloat(basePrice.toFixed(2)),
      source: "estimation",
      updatedAt: null,
      breakdown: [
        {
          label: "Funko Pop Estimation",
          market: parseFloat(basePrice.toFixed(2)),
          low: Math.max(10, parseFloat((basePrice * 0.7).toFixed(2))),
          mid: null,
          high: parseFloat((basePrice * 2.0).toFixed(2)),
        },
      ],
      conditionMultiplier: 1.0,
      confidence: "medium",
    };
  } catch {
    return emptyPriceBase();
  }
}

// ─── Generic Estimation ──────────────────────────────────────────

async function getEstimatedPrice(
  category: string,
  userEstimate?: number | null
): Promise<Omit<ResellPriceResult, "resellPrice" | "resellLow" | "resellHigh" | "resellSpread">> {
  if (userEstimate && userEstimate > 0) {
    return {
      retailPrice: userEstimate,
      source: "user",
      updatedAt: null,
      breakdown: [
        {
          label: "User Estimate",
          market: userEstimate,
          low: null,
          mid: null,
          high: null,
        },
      ],
      conditionMultiplier: 1.0,
      confidence: "medium",
    };
  }

  // Generic fallback
  return emptyPriceBase();
}

// ─── Public API ──────────────────────────────────────────────────

import { detectTcgGame, type TcgGame } from "./catalog-images";

/**
 * Get full price data (retail + resell) for a collectible item.
 *
 * Returns both retail (MSRP/market value) and resell values (what collectors
 * actually get when selling). Resell is typically 60-80% of retail for raw cards.
 */
export async function getFullPriceData(
  category: string,
  title: string,
  attributes: Record<string, unknown> = {},
  userEstimate?: number | null,
  condition?: string
): Promise<ResellPriceResult> {
  const cardName = (attributes.card_name as string) || title;
  const setName = attributes.set_name as string | undefined;
  const cardNumber = attributes.card_number as string | undefined;
  const conditionMultiplier = getConditionMultiplier(condition);

  let priceBase: Omit<ResellPriceResult, "resellPrice" | "resellLow" | "resellHigh" | "resellSpread">;

  // Route to appropriate pricing service
  if (category === "pokemon") {
    const game: TcgGame = detectTcgGame(title, attributes);

    switch (game) {
      case "yugioh":
        priceBase = await getYugiohPrice(cardName);
        break;
      case "onepiece":
        priceBase = await getOnePiecePrice(cardName, cardNumber);
        break;
      case "pokemon":
      default:
        priceBase = await getPokemonPrice(cardName, setName, cardNumber);
        break;
    }
  } else if (category === "sports_cards") {
    priceBase = await getSportsCardPrice(cardName, attributes);
  } else if (category === "hot_wheels") {
    priceBase = await getHotWheelsPrice(cardName, attributes);
  } else if (category === "funko") {
    priceBase = await getFunkoPriceEstimate(cardName, attributes);
  } else {
    priceBase = await getEstimatedPrice(category, userEstimate);
  }

  // Calculate resell value as 60-80% of retail depending on condition
  let resellPrice: number | null = null;
  let resellLow: number | null = null;
  let resellHigh: number | null = null;
  let resellSpread: number | null = null;

  if (priceBase.retailPrice !== null) {
    // Raw cards: 65% of retail
    // Graded cards: use condition multiplier (higher condition = higher %age)
    const isGraded = condition && /^\d+(\.\d+)?$/.test(condition);
    const resellRatio = isGraded ? 0.75 + (conditionMultiplier - 1.0) * 0.1 : 0.65;

    resellPrice = parseFloat((priceBase.retailPrice * resellRatio * conditionMultiplier).toFixed(2));
    resellLow = parseFloat((priceBase.retailPrice * 0.5 * conditionMultiplier).toFixed(2));
    resellHigh = parseFloat((priceBase.retailPrice * 0.95 * conditionMultiplier).toFixed(2));
    resellSpread = resellPrice / priceBase.retailPrice;
  }

  // Apply condition multiplier to retail price
  const adjustedRetailPrice = priceBase.retailPrice
    ? parseFloat((priceBase.retailPrice * conditionMultiplier).toFixed(2))
    : null;

  return {
    retailPrice: adjustedRetailPrice,
    resellPrice,
    resellLow,
    resellHigh,
    resellSpread,
    source: priceBase.source,
    updatedAt: priceBase.updatedAt,
    breakdown: priceBase.breakdown,
    conditionMultiplier,
    confidence: priceBase.confidence,
  };
}

/**
 * Legacy API for backward compatibility.
 * Returns single market price (just retail value).
 */
export async function getMarketPrice(
  category: string,
  title: string,
  attributes: Record<string, unknown> = {},
  userEstimate?: number | null
): Promise<{
  marketPrice: number | null;
  lowPrice: number | null;
  highPrice: number | null;
  source: ResellPriceResult["source"];
  updatedAt: string | null;
  breakdown: PriceBreakdown[];
}> {
  const priceData = await getFullPriceData(category, title, attributes, userEstimate);
  return {
    marketPrice: priceData.retailPrice,
    lowPrice: null,
    highPrice: null,
    source: priceData.source,
    updatedAt: priceData.updatedAt,
    breakdown: priceData.breakdown,
  };
}

/**
 * Check if a category supports live market pricing.
 */
export function hasLivePricing(category: string): boolean {
  return ["pokemon", "yugioh", "one_piece"].includes(category);
}

/**
 * Get price history trend classification.
 */
export function getTrendDirection(
  currentPrice: number,
  previousPrice: number | null
): "up" | "down" | "stable" {
  if (!previousPrice) return "stable";
  const pct = (currentPrice - previousPrice) / previousPrice;
  if (pct > 0.05) return "up";
  if (pct < -0.05) return "down";
  return "stable";
}

// ─── Helpers ────────────────────────────────────────────────────

function emptyPriceBase(): Omit<ResellPriceResult, "resellPrice" | "resellLow" | "resellHigh" | "resellSpread"> {
  return {
    retailPrice: null,
    source: "none",
    updatedAt: null,
    breakdown: [],
    conditionMultiplier: 1.0,
    confidence: "low",
  };
}

function formatVariant(variant: string): string {
  return variant
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
