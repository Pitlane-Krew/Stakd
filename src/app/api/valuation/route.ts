import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Valuation API proxy.
 * Fetches recent sold listings from external sources (eBay, etc.)
 * and stores them in price_history. This keeps API keys server-side
 * and provides caching via the database.
 *
 * POST /api/valuation
 * Body: { itemId: string, query: string, category?: string }
 */

interface ValuationRequest {
  itemId: string;
  query: string;
  category?: string;
}

interface ExternalSale {
  price: number;
  source: string;
  sale_date: string | null;
  listing_url: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ValuationRequest;
    const { itemId, query, category } = body;

    if (!itemId || !query) {
      return NextResponse.json(
        { error: "itemId and query are required" },
        { status: 400 }
      );
    }

    // Check if we have recent data (within 24h) to avoid excessive API calls
    const supabase = await createServiceRoleClient();
    const { data: recentPrices } = await supabase
      .from("price_history")
      .select("fetched_at")
      .eq("item_id", itemId)
      .order("fetched_at", { ascending: false })
      .limit(1);

    const lastFetch = recentPrices?.[0]?.fetched_at;
    if (lastFetch) {
      const hoursSinceLastFetch =
        (Date.now() - new Date(lastFetch).getTime()) / 3600000;
      if (hoursSinceLastFetch < 24) {
        // Return cached data
        const { data: cached } = await supabase
          .from("price_history")
          .select("*")
          .eq("item_id", itemId)
          .order("fetched_at", { ascending: false })
          .limit(20);

        return NextResponse.json({
          source: "cache",
          prices: cached ?? [],
          estimatedValue: calculateEstimate(cached ?? []),
        });
      }
    }

    // Fetch from external sources
    const sales = await fetchExternalPrices(query, category);

    // Store in price_history
    if (sales.length > 0) {
      const inserts = sales.map((sale) => ({
        item_id: itemId,
        price: sale.price,
        source: sale.source,
        sale_date: sale.sale_date,
        listing_url: sale.listing_url,
      }));

      await supabase.from("price_history").insert(inserts);
    }

    // Update item's estimated_value
    const estimate = calculateEstimate(sales);
    if (estimate > 0) {
      await supabase
        .from("items")
        .update({ estimated_value: estimate })
        .eq("id", itemId);
    }

    // Return full history
    const { data: allPrices } = await supabase
      .from("price_history")
      .select("*")
      .eq("item_id", itemId)
      .order("fetched_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
      source: "fresh",
      prices: allPrices ?? [],
      estimatedValue: estimate,
      newSalesFound: sales.length,
    });
  } catch (err) {
    console.error("Valuation API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Fetches sold listings from external sources.
 * Currently uses eBay completed listings as primary source.
 * Expand with PSA, Goldin, etc. in future phases.
 */
async function fetchExternalPrices(
  query: string,
  _category?: string
): Promise<ExternalSale[]> {
  const sales: ExternalSale[] = [];

  // eBay Finding API
  const ebayAppId = process.env.EBAY_APP_ID;
  if (ebayAppId) {
    try {
      const params = new URLSearchParams({
        "OPERATION-NAME": "findCompletedItems",
        "SERVICE-VERSION": "1.13.0",
        "SECURITY-APPNAME": ebayAppId,
        "RESPONSE-DATA-FORMAT": "JSON",
        "REST-PAYLOAD": "",
        keywords: query,
        "itemFilter(0).name": "SoldItemsOnly",
        "itemFilter(0).value": "true",
        "sortOrder": "EndTimeSorted",
        "paginationInput.entriesPerPage": "10",
      });

      const res = await fetch(
        `https://svcs.ebay.com/services/search/FindingService/v1?${params}`,
        { next: { revalidate: 3600 } } // Cache for 1 hour
      );

      if (res.ok) {
        const data = await res.json();
        const items =
          data?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item ?? [];

        for (const item of items) {
          const price = parseFloat(
            item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ ?? "0"
          );
          if (price > 0) {
            sales.push({
              price,
              source: "eBay",
              sale_date: item.listingInfo?.[0]?.endTime?.[0] ?? null,
              listing_url: item.viewItemURL?.[0] ?? null,
            });
          }
        }
      }
    } catch (err) {
      console.error("eBay API error:", err);
    }
  }

  return sales;
}

/**
 * Calculates estimated value from recent sales.
 * Uses trimmed mean (remove top/bottom 10%) for accuracy.
 */
function calculateEstimate(
  sales: Array<{ price: number }>
): number {
  if (sales.length === 0) return 0;

  const prices = sales.map((s) => s.price).sort((a, b) => a - b);

  if (prices.length <= 3) {
    // Not enough data for trimmed mean, use simple average
    return Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  }

  // Trimmed mean: remove top and bottom 10%
  const trimCount = Math.max(1, Math.floor(prices.length * 0.1));
  const trimmed = prices.slice(trimCount, prices.length - trimCount);
  const avg = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;

  return Math.round(avg * 100) / 100;
}
