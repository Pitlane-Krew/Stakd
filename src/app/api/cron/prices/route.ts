import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getFullPriceData, getTrendDirection } from "@/services/pricing";

/**
 * Price Update Cron Job
 *
 * Runs every 6 hours to:
 * 1. Fetch prices for items that haven't been updated in 24+ hours
 * 2. Store results in price_history table
 * 3. Create/update price_snapshots for charting
 * 4. Flag items with significant price changes (>5%)
 *
 * Processes items in batches of 25 to respect API rate limits.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createServiceRoleClient();
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    // Get items that need price updates
    // Prioritize items with pricing enabled and haven't been updated recently
    const { data: items, error: fetchError } = await supabase
      .from("items")
      .select(
        `
        id,
        title,
        category,
        attributes,
        estimated_value,
        condition,
        created_at
      `
      )
      .not("estimated_value", "is", null)
      .lt("updated_at", twentyFourHoursAgo)
      .order("updated_at", { ascending: true })
      .limit(25);

    if (fetchError) {
      console.error("Failed to fetch items for price update:", fetchError);
      return NextResponse.json(
        { error: "Database fetch failed", details: fetchError.message },
        { status: 500 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json({
        success: true,
        itemsProcessed: 0,
        pricesUpdated: 0,
        message: "No items requiring price updates",
      });
    }

    let pricesUpdated = 0;
    let pricesAlerted = 0;
    const results: Array<{
      itemId: string;
      priceUpdated: boolean;
      newPrice: number | null;
      previousPrice: number | null;
      trend: "up" | "down" | "stable" | null;
      error?: string;
    }> = [];

    // Process each item
    for (const item of items) {
      try {
        const attributes = (item.attributes as Record<string, unknown>) || {};

        // Fetch current price data
        const priceData = await getFullPriceData(
          item.category,
          item.title,
          attributes,
          item.estimated_value as number | undefined,
          item.condition as string | undefined
        );

        // Only proceed if we got a retail price
        if (!priceData.retailPrice) {
          results.push({
            itemId: item.id,
            priceUpdated: false,
            newPrice: null,
            previousPrice: null,
            trend: null,
          });
          continue;
        }

        // Get the most recent price for this item
        const { data: lastPrice } = await supabase
          .from("price_history")
          .select("price")
          .eq("item_id", item.id)
          .order("fetched_at", { ascending: false })
          .limit(1)
          .single();

        const previousPrice = lastPrice?.price ?? item.estimated_value;
        const trend = getTrendDirection(priceData.retailPrice, previousPrice as number | null);

        // Insert price history record
        const { error: insertError } = await supabase.from("price_history").insert({
          item_id: item.id,
          price: priceData.retailPrice,
          source: priceData.source,
          sale_date: now.toISOString().split("T")[0],
          fetched_at: now.toISOString(),
        } as any);

        if (insertError) {
          results.push({
            itemId: item.id,
            priceUpdated: false,
            newPrice: priceData.retailPrice,
            previousPrice: previousPrice as number | null,
            trend: null,
            error: insertError.message,
          });
          continue;
        }

        // Check for significant price change (>5%)
        const priceChange =
          previousPrice && previousPrice > 0
            ? Math.abs((priceData.retailPrice - previousPrice) / previousPrice)
            : 0;

        if (priceChange > 0.05) {
          pricesAlerted++;
        }

        // Update price snapshot for today
        const { error: snapshotError } = await supabase.from("price_snapshots").upsert(
          {
            item_id: item.id,
            avg_price: priceData.retailPrice,
            min_price: priceData.resellLow,
            max_price: priceData.resellPrice,
            sale_count: 1,
            trend,
            snapshot_date: now.toISOString().split("T")[0],
          } as any,
          { onConflict: "item_id,snapshot_date" }
        );

        if (snapshotError && snapshotError.code !== "23505") {
          // 23505 is unique constraint, which is fine
          console.warn(`Snapshot update warning for item ${item.id}:`, snapshotError);
        }

        // Update item's estimated_value to latest price
        await supabase
          .from("items")
          .update({
            estimated_value: priceData.retailPrice,
            updated_at: now.toISOString(),
          })
          .eq("id", item.id);

        pricesUpdated++;
        results.push({
          itemId: item.id,
          priceUpdated: true,
          newPrice: priceData.retailPrice,
          previousPrice: previousPrice as number | null,
          trend,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.error(`Error processing item ${item.id}:`, errorMsg);
        results.push({
          itemId: item.id,
          priceUpdated: false,
          newPrice: null,
          previousPrice: null,
          trend: null,
          error: errorMsg,
        });
      }
    }

    // Log the job completion
    const duration = new Date().getTime() - now.getTime();
    console.log(
      `Price cron completed: ${pricesUpdated}/${items.length} updated, ${pricesAlerted} significant changes, ${duration}ms`
    );

    return NextResponse.json(
      {
        success: true,
        itemsProcessed: items.length,
        pricesUpdated,
        significantChanges: pricesAlerted,
        duration,
        results,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Price cron failed:", errorMsg);
    return NextResponse.json(
      { error: "Cron job failed", details: errorMsg },
      { status: 500 }
    );
  }
}
