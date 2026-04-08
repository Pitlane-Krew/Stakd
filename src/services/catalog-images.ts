/**
 * STAKD Catalog Image Service
 *
 * Fetches official card/product images from free public APIs.
 * Used as fallback when the user hasn't uploaded their own photo.
 *
 * Supported TCGs:
 *  - Pokémon TCG  → pokemontcg.io (free, no key for low volume)
 *  - Yu-Gi-Oh     → YGOPRODeck API v7 (free)
 *  - One Piece TCG → optcgapi.com (free)
 *
 * Non-TCG items (sports, sneakers, figures, etc.) get a styled
 * placeholder generated client-side — see PlaceholderCard component.
 */

// ─── Types ──────────────────────────────────────────────────────

export interface CatalogImageResult {
  imageUrl: string | null;
  source: string;
  matchConfidence: "exact" | "partial" | "none";
  cardData?: Record<string, unknown>;
}

// ─── Pokémon TCG ────────────────────────────────────────────────
// Docs: https://docs.pokemontcg.io/

async function searchPokemonCard(
  cardName: string,
  setName?: string,
  cardNumber?: string
): Promise<CatalogImageResult> {
  try {
    // Build the most specific query we can
    let query = `name:"${cardName}"`;
    if (setName) query += ` set.name:"${setName}"`;
    if (cardNumber) query += ` number:${cardNumber}`;

    const res = await fetch(
      `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}&pageSize=1&select=id,name,images,set`,
      { next: { revalidate: 86400 } } // Cache for 24h
    );

    if (!res.ok) return { imageUrl: null, source: "pokemontcg", matchConfidence: "none" };

    const data = await res.json();
    const card = data?.data?.[0];

    if (!card) return { imageUrl: null, source: "pokemontcg", matchConfidence: "none" };

    return {
      imageUrl: card.images?.large || card.images?.small || null,
      source: "pokemontcg",
      matchConfidence: cardNumber ? "exact" : "partial",
      cardData: {
        id: card.id,
        name: card.name,
        set: card.set?.name,
      },
    };
  } catch {
    return { imageUrl: null, source: "pokemontcg", matchConfidence: "none" };
  }
}

// ─── Yu-Gi-Oh (YGOPRODeck) ─────────────────────────────────────
// Docs: https://ygoprodeck.com/api-guide/

async function searchYugiohCard(cardName: string): Promise<CatalogImageResult> {
  try {
    // Try exact name first, fall back to fuzzy
    const res = await fetch(
      `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(cardName)}`,
      { next: { revalidate: 86400 } }
    );

    let data;
    if (res.ok) {
      data = await res.json();
    } else {
      // Try fuzzy search
      const fuzzyRes = await fetch(
        `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(cardName)}&num=1`,
        { next: { revalidate: 86400 } }
      );
      if (!fuzzyRes.ok) return { imageUrl: null, source: "ygoprodeck", matchConfidence: "none" };
      data = await fuzzyRes.json();
    }

    const card = data?.data?.[0];
    if (!card) return { imageUrl: null, source: "ygoprodeck", matchConfidence: "none" };

    // YGOPRODeck provides multiple image formats
    const images = card.card_images?.[0];

    return {
      imageUrl: images?.image_url || images?.image_url_small || null,
      source: "ygoprodeck",
      matchConfidence: card.name.toLowerCase() === cardName.toLowerCase() ? "exact" : "partial",
      cardData: {
        id: card.id,
        name: card.name,
        type: card.type,
      },
    };
  } catch {
    return { imageUrl: null, source: "ygoprodeck", matchConfidence: "none" };
  }
}

// ─── One Piece TCG ──────────────────────────────────────────────
// Docs: https://optcgapi.com/

async function searchOnePieceCard(
  cardName: string,
  cardNumber?: string
): Promise<CatalogImageResult> {
  try {
    // OPTCG API supports search by name or card number
    const endpoint = cardNumber
      ? `https://optcgapi.com/api/cards/${encodeURIComponent(cardNumber)}`
      : `https://optcgapi.com/api/cards?name=${encodeURIComponent(cardName)}&limit=1`;

    const res = await fetch(endpoint, { next: { revalidate: 86400 } });
    if (!res.ok) return { imageUrl: null, source: "optcgapi", matchConfidence: "none" };

    const data = await res.json();
    const card = cardNumber ? data : data?.data?.[0];

    if (!card) return { imageUrl: null, source: "optcgapi", matchConfidence: "none" };

    return {
      imageUrl: card.image_url || card.imageUrl || null,
      source: "optcgapi",
      matchConfidence: cardNumber ? "exact" : "partial",
      cardData: {
        id: card.id || card.card_number,
        name: card.name,
      },
    };
  } catch {
    return { imageUrl: null, source: "optcgapi", matchConfidence: "none" };
  }
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Detect which TCG an item belongs to and fetch the catalog image.
 *
 * The `pokemon` category in STAKD covers multiple TCGs (Pokémon,
 * Yu-Gi-Oh, One Piece, etc.). We detect the specific TCG from the
 * item's attributes (set_name patterns, card_name patterns) or let
 * the user explicitly tag it.
 */
export type TcgGame = "pokemon" | "yugioh" | "onepiece" | "other";

export function detectTcgGame(
  title: string,
  attributes: Record<string, unknown> = {}
): TcgGame {
  const combined = `${title} ${attributes.set_name || ""} ${attributes.card_name || ""}`.toLowerCase();

  // Yu-Gi-Oh detection
  const yugiohSignals = [
    "yu-gi-oh", "yugioh", "blue-eyes", "dark magician", "exodia",
    "xyz", "synchro", "pendulum", "link monster", "spell card",
    "trap card", "lob-", "mrd-", "sdk-", "sdj-",
  ];
  if (yugiohSignals.some((s) => combined.includes(s))) return "yugioh";

  // One Piece detection
  const opSignals = [
    "one piece", "onepiece", "op-01", "op-02", "op-03", "op-04",
    "op-05", "op-06", "op-07", "op-08", "op-09", "op-10", "op-11",
    "op-12", "op-13", "op-14", "op-15", "monkey d.", "luffy",
    "roronoa", "zoro", "nami", "sanji", "chopper",
  ];
  if (opSignals.some((s) => combined.includes(s))) return "onepiece";

  // Default to Pokémon for the `pokemon` category
  return "pokemon";
}

/**
 * Main entry point: get a catalog image for an item.
 * Returns the best image URL found, or null if no match.
 */
export async function getCatalogImage(
  category: string,
  title: string,
  attributes: Record<string, unknown> = {}
): Promise<CatalogImageResult> {
  const cardName = (attributes.card_name as string) || title;
  const setName = attributes.set_name as string | undefined;
  const cardNumber = attributes.card_number as string | undefined;

  // Only TCG categories get API lookups
  if (category === "pokemon") {
    const game = detectTcgGame(title, attributes);

    switch (game) {
      case "yugioh":
        return searchYugiohCard(cardName);
      case "onepiece":
        return searchOnePieceCard(cardName, cardNumber);
      case "pokemon":
      default:
        return searchPokemonCard(cardName, setName, cardNumber);
    }
  }

  // Non-TCG categories don't have free image APIs
  return { imageUrl: null, source: "none", matchConfidence: "none" };
}

/**
 * Check if a category supports catalog image lookup.
 */
export function hasCatalogImageSupport(category: string): boolean {
  return category === "pokemon"; // Expand as more APIs are added
}
