import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createServiceRoleClient();

    // Get all items that need price updates
    const { data: items } = await supabase
      .from("items")
      .select("id, title, category")
      .not("estimated_value", "is", null)
      .limit(100);

    // TODO: Implement price fetching from eBay/PSA/Goldin APIs
    // For each item, fetch latest prices and create price_history entries
    // Then generate price_snapshots for charting

    return NextResponse.json({
      success: true,
      itemsChecked: items?.length ?? 0,
    });
  } catch (error) {
    console.error("Price cron failed:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
