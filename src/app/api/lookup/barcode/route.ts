import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing barcode" }, { status: 400 });
  }

  // Try multiple free barcode APIs
  try {
    // 1. Try UPC ItemDB (free, no key needed)
    const upcRes = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`, {
      headers: { "Accept": "application/json" },
    });

    if (upcRes.ok) {
      const data = await upcRes.json();
      if (data.items?.length > 0) {
        const item = data.items[0];
        return NextResponse.json({
          found: true,
          title: item.title || `Item ${code}`,
          brand: item.brand || "Unknown",
          category: item.category || "general",
          description: item.description || "",
          imageUrl: item.images?.[0] || null,
          ean: item.ean,
          upc: item.upc,
        });
      }
    }

    // 2. Fallback: Open Food Facts (good for sealed products, snacks in boxes, etc.)
    const offRes = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
    if (offRes.ok) {
      const data = await offRes.json();
      if (data.status === 1 && data.product) {
        return NextResponse.json({
          found: true,
          title: data.product.product_name || `Product ${code}`,
          brand: data.product.brands || "Unknown",
          category: "general",
          description: data.product.generic_name || "",
          imageUrl: data.product.image_url || null,
        });
      }
    }

    // Not found in any database
    return NextResponse.json({
      found: false,
      title: `Unknown Item (${code})`,
      brand: "Unknown",
      category: "general",
      description: "Item not found in barcode databases. You can add details manually.",
    });

  } catch (error) {
    console.error("Barcode lookup failed:", error);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
