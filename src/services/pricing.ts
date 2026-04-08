/**
 * STAKD Free Pricing Service
 *
 * Fetches market prices from the same free TCG APIs used for images.
 * No API keys or paid subscriptions required.
 *
 * Sources:
 *  - Pokémon TCG  → pokemontcg.io  → TCGPlayer market prices
 *  - Yu-Gi-Oh     → YGOPRODeck     → TCGPlayer / CardMarket / Amazon prices
 *  - One Piece    → optcgapi.com   → Limited pricing
 *
 * For non-TCG categories, falls back to user-entered estimated_value
 * until eBay API access is restored.
 */

// ─── Types ──────────────────────────────────────────────────────

export interface PriceResult {
  /** Primary recommended market price (USD) */
  marketPrice: number | null;
  /** Low end of range */
  lowPrice: number | null;
  /** High end of range */
  highPrice: number | null;
  /** Where the price came from */
  source: "tcgplayer" | "cardmarket" | "amazon" | "user" | "none";
  /** Last updated timestamp from the API */
  updatedAt: string | null;
  /** Raw price breakdown by condition/variant */
  breakdown: PriceBreakdown[];
}

export interface PriceBreakdown {
  label: string;
  market: number | null;
  low: number | null;
  mid: number | null;
  high: number | null;
}

// ─── Pokémon TCG Prices ─────────────────────────────────────────

export async function getPokemonPrice(
  cardName: string,
  setName?: string,
  cardNumber?: string
): Promise<PriceResult> {
  try {
    let query = `name:"${cardName}"`;
    if (setName) query += ` set.name:"${setName}"`;
    if (cardNumber) query += ` number:${cardNumber}`;

    const res = await fetch(
      `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}&pageSize=1&select=id,name,tcgplayer,cardmarket`,
      { next: { revalidate: 3600 } } // 1h cache for prices
    );

    if (!res.ok) return emptyResult();

    const data = await res.json();
    const card = data?.data?.[0];
    if (!card) return emptyResult();

    // TCGPlayer prices (primary — USD)
    const tcg = card.tcgplayer;
    if (tcg?.prices) {
      const breakdown: PriceBreakdown[] = [];
      let bestMarket: number | null = null;
      let bestLow: number | null = null;
      let bestHigh: number | null = null;

      // TCGPlayer returns prices per variant (holofoil, reverseHolofoil, normal, etc.)
      for (const [variant, prices] of Object.entries(tcg.prices)) {
        const p = prices as Record<string, number | null>;
        breakdown.push({
          label: formatVariant(variant),
          market: p.market ?? null,
          low: p.low ?? null,
          mid: p.mid ?? null,
          high: p.high ?? null,
        });

        // Use the highest market price variant as the primary
        if (p.market && (!bestMarket || p.market > bestMarket)) {
          bestMarket = p.market;
          bestLow = p.low ?? null;
          bestHigh = p.high ?? null;
        }
      }

      return {
        marketPrice: bestMarket,
        lowPrice: bestLow,
        highPrice: bestHigh,
        source: "tcgplayer",
        updatedAt: tcg.updatedAt ?? null,
        breakdown,
      };
    }

    // Fallback to CardMarket prices (EUR — approximate to USD)
    const cm = card.cardmarket;
    if (cm?.prices) {
      const p = cm.prices;
      return {
        marketPrice: p.averageSellPrice ?? p.avg1 ?? null,
        lowPrice: p.lowPrice ?? null,
        highPrice: p.avg30 ?? null,
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
      };
    }

    return emptyResult();
  } catch {
    return emptyResult();
  }
}

// ─── Yu-Gi-Oh Prices ────────────────────────────────────────────

export async function getYugiohPrice(cardName: string): Promise<PriceResult> {
  try {
    // Try exact name, fall back to fuzzy
    let res = await fetch(
      `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(cardName)}`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      res = await fetch(
        `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(cardName)}&num=1`,
        { next: { revalidate: 3600 } }
      );
      if (!res.ok) return emptyResult();
    }

    const data = await res.json();
    const card = data?.data?.[0];
    if (!card?.card_prices?.[0]) return emptyResult();

    const prices = card.card_prices[0];
    const tcgPrice = parseFloat(prices.tcgplayer_price) || null;
    const cmPrice = parseFloat(prices.cardmarket_price) || null;
    const amazonPrice = parseFloat(prices.amazon_price) || null;

    // Prefer TCGPlayer, then CardMarket, then Amazon
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
      marketPrice: primary,
      lowPrice: null,
      highPrice: null,
      source: source as PriceResult["source"],
      updatedAt: null,
      breakdown,
    };
  } catch {
    return emptyResult();
  }
}

// ─── One Piece Prices ───────────────────────────────────────────

export async function getOnePiecePrice(
  cardName: string,
  cardNumber?: string
): Promise<PriceResult> {
  // OPTCG API has limited price data — return empty for now
  // Can expand when their pricing endpoints mature
  return emptyResult();
}

// ─── Public API ─────────────────────────────────────────────────

import { detectTcgGame, type TcgGame } from "./catalog-images";

/**
 * Get market price for a collectible item.
 *
 * For TCG cards, fetches live prices from free APIs.
 * For non-TCG items, returns the user's estimated_value.
 */
export async function getMarketPrice(
  category: string,
  title: string,
  attributes: Record<string, unknown> = {},
  userEstimate?: number | null
): Promise<PriceResult> {
  const cardName = (attributes.card_name as string) || title;
  const setName = attributes.set_name as string | undefined;
  const cardNumber = attributes.card_number as string | undefined;

  if (category === "pokemon") {
    const game: TcgGame = detectTcgGame(title, attributes);

    switch (game) {
      case "yugioh":
        return getYugiohPrice(cardName);
      case "onepiece":
        return getOnePiecePrice(cardName, cardNumber);
      case "pokemon":
      default:
        return getPokemonPrice(cardName, setName, cardNumber);
    }
  }

  // Non-TCG: use user's estimate
  if (userEstimate) {
    return {
      marketPrice: userEstimate,
      lowPrice: null,
      highPrice: null,
      source: "user",
      updatedAt: null,
      breakdown: [],
    };
  }

  return emptyResult();
}

/**
 * Check if a category supports live market pricing.
 */
export function hasLivePricing(category: string): boolean {
  return category === "pokemon";
}

// ─── Helpers ────────────────────────────────────────────────────

function emptyResult(): PriceResult {
  return {
    marketPrice: null,
    lowPrice: null,
    highPrice: null,
    source: "none",
    updatedAt: null,
    breakdown: [],
  };
}

function formatVariant(variant: string): string {
  return variant
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
