import { NextRequest, NextResponse } from "next/server";
import { getMarketPrice, hasLivePricing } from "@/services/pricing";

/**
 * Quick price lookup — no auth required, no DB writes.
 * Used by the item card / detail page to show live market prices.
 *
 * GET /api/valuation/quick?category=pokemon&title=Charizard&set_name=Base+Set&card_number=4
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category") ?? "";
  const title = searchParams.get("title") ?? "";

  if (!title) {
    return NextResponse.json(
      { error: "title is required" },
      { status: 400 }
    );
  }

  if (!hasLivePricing(category)) {
    return NextResponse.json({
      supported: false,
      message: "Live pricing not available for this category yet",
    });
  }

  // Build attributes from query params
  const attributes: Record<string, unknown> = {};
  const setName = searchParams.get("set_name");
  const cardNumber = searchParams.get("card_number");
  const cardName = searchParams.get("card_name");
  if (setName) attributes.set_name = setName;
  if (cardNumber) attributes.card_number = cardNumber;
  if (cardName) attributes.card_name = cardName;

  const result = await getMarketPrice(category, title, attributes);

  return NextResponse.json({
    supported: true,
    ...result,
  });
}
