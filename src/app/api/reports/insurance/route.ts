import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * GET /api/reports/insurance?collectionId=xxx
 *
 * Generates a JSON report payload of a collection suitable for
 * PDF rendering on the client side. Includes itemized list with
 * values, images, conditions, and collection summary stats.
 */
export async function GET(request: NextRequest) {
  const collectionId = request.nextUrl.searchParams.get("collectionId");
  if (!collectionId) {
    return NextResponse.json(
      { error: "collectionId required" },
      { status: 400 }
    );
  }

  try {
    const supabase = await createServiceRoleClient();

    // Get collection details
    const { data: collection, error: colError } = await supabase
      .from("collections")
      .select("*")
      .eq("id", collectionId)
      .single();

    if (colError || !collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    // Get all items in the collection
    const { data: items, error: itemError } = await supabase
      .from("items")
      .select("*")
      .eq("collection_id", collectionId)
      .order("estimated_value", { ascending: false });

    if (itemError) {
      return NextResponse.json(
        { error: "Failed to fetch items" },
        { status: 500 }
      );
    }

    // Get owner profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", collection.user_id)
      .single();

    // Compute summary stats
    const allItems = items ?? [];
    const totalValue = allItems.reduce(
      (sum, i) => sum + (i.estimated_value ?? 0),
      0
    );
    const totalPurchased = allItems.reduce(
      (sum, i) => sum + (i.purchase_price ?? 0),
      0
    );
    const gradedCount = allItems.filter(
      (i) => i.condition === "graded" && i.grade_value
    ).length;
    const topItems = allItems.slice(0, 10); // already sorted by value desc

    const conditionBreakdown: Record<string, number> = {};
    for (const item of allItems) {
      const cond = item.condition ?? "unknown";
      conditionBreakdown[cond] = (conditionBreakdown[cond] ?? 0) + 1;
    }

    const report = {
      generatedAt: new Date().toISOString(),
      owner: {
        name: profile?.display_name ?? profile?.username ?? "Unknown",
      },
      collection: {
        id: collection.id,
        name: collection.name,
        category: collection.category,
        description: collection.description,
        itemCount: allItems.length,
        totalEstimatedValue: totalValue,
        totalPurchasePrice: totalPurchased,
        roi:
          totalPurchased > 0
            ? ((totalValue - totalPurchased) / totalPurchased) * 100
            : null,
        gradedItemCount: gradedCount,
        conditionBreakdown,
      },
      topItems: topItems.map((i) => ({
        id: i.id,
        title: i.title,
        category: i.category,
        condition: i.condition,
        gradeValue: i.grade_value,
        gradingCompany: i.grading_company,
        year: i.year,
        estimatedValue: i.estimated_value,
        purchasePrice: i.purchase_price,
        imageUrl: i.image_urls?.[0] ?? null,
      })),
      allItems: allItems.map((i) => ({
        id: i.id,
        title: i.title,
        category: i.category,
        condition: i.condition,
        gradeValue: i.grade_value,
        gradingCompany: i.grading_company,
        year: i.year,
        brand: i.brand,
        estimatedValue: i.estimated_value,
        purchasePrice: i.purchase_price,
        imageUrl: i.image_urls?.[0] ?? null,
        tags: i.tags,
      })),
    };

    return NextResponse.json(report);
  } catch (err) {
    console.error("Insurance report error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
