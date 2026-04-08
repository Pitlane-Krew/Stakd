import { NextRequest, NextResponse } from "next/server";
import { getApiUser, checkRateLimit } from "@/lib/api-auth";

/**
 * POST /api/import/scan-photo
 *
 * AI-powered photo import — snap a photo of cards spread on a table,
 * a binder page, a shelf of Hot Wheels, etc., and Claude identifies
 * every item with estimated values.
 *
 * Body: { imageUrl: string, category?: string }
 * Returns: { items: Array<{ name, category, year, estimatedValue, attributes, confidence }> }
 */

interface DetectedItem {
  name: string;
  category: string;
  year: number | null;
  brand: string | null;
  estimatedValue: number | null;
  condition: string;
  attributes: Record<string, unknown>;
  confidence: number;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { user, error: authError } = await getApiUser();
    if (authError) return authError;

    // Check rate limit (20 per hour)
    const { allowed, remaining } = await checkRateLimit(user!.id, "scan_photo", 20);
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again in an hour." },
        { status: 429, headers: { "X-RateLimit-Remaining": "0" } }
      );
    }

    const { imageUrl, category } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl required" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
    }

    // Fetch image
    let imageData: string;
    let mediaType: string;
    try {
      const imgRes = await fetch(imageUrl);
      const buffer = await imgRes.arrayBuffer();
      imageData = Buffer.from(buffer).toString("base64");
      mediaType = imgRes.headers.get("content-type") || "image/jpeg";
    } catch {
      return NextResponse.json({ error: "Failed to fetch image" }, { status: 400 });
    }

    const categoryHint = category
      ? `Focus on ${category} items specifically.`
      : "Identify the category of each item (pokemon, sports_cards, hot_wheels, figures, sneakers, comics).";

    const prompt = `You are an expert collectibles identifier. Analyze this image and identify EVERY collectible item visible.

${categoryHint}

For each item found, provide:
- Exact name/title (be as specific as possible — include set name, card number, variant)
- Category
- Year (if identifiable)
- Brand
- Estimated market value in USD (based on your knowledge of recent sale prices)
- Apparent condition (mint, near_mint, excellent, good, poor)
- Category-specific attributes (set_name, card_number, rarity, player_name, etc.)
- Confidence score (0-100)

Respond in EXACTLY this JSON format:
{
  "items": [
    {
      "name": "Charizard VMAX (Shining Fates SV107)",
      "category": "pokemon",
      "year": 2021,
      "brand": "Pokemon TCG",
      "estimatedValue": 485,
      "condition": "near_mint",
      "attributes": { "set_name": "Shining Fates", "card_number": "SV107", "rarity": "Secret Rare" },
      "confidence": 85
    }
  ],
  "totalItemsDetected": 1,
  "imageQualityNote": "Good lighting, clear image"
}

If you can partially identify an item, include it with lower confidence.
Return ONLY the JSON object.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20241022",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: imageData } },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "AI analysis failed" }, { status: 502 });
    }

    const data = await res.json();
    const responseText = data.content?.[0]?.text ?? "";

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { items: [] };
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({ items: [], error: "Failed to parse results" });
    }
  } catch (err) {
    console.error("Photo scan error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
