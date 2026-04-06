import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * POST /api/auth-check
 *
 * Collectible Authentication — AI + Community hybrid system.
 *
 * Step 1: AI Vision analyzes submitted images for authenticity markers
 * Step 2: Results posted for community expert review
 * Step 3: Combined score = final verdict
 *
 * Body: { imageUrls: string[], category: string, itemId?: string }
 */

export async function POST(request: NextRequest) {
  try {
    const { imageUrls, category, itemId } = await request.json();

    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json(
        { error: "At least one image URL is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    // Fetch first image for analysis
    let imageData: string;
    let mediaType: string;
    try {
      const imgRes = await fetch(imageUrls[0]);
      const buffer = await imgRes.arrayBuffer();
      imageData = Buffer.from(buffer).toString("base64");
      mediaType = imgRes.headers.get("content-type") || "image/jpeg";
    } catch {
      return NextResponse.json(
        { error: "Failed to fetch image" },
        { status: 400 }
      );
    }

    const prompt = `You are an expert collectible authenticator. Analyze this ${category || "collectible"} image for authenticity.

Check for these common counterfeiting indicators:
- Print quality (dot pattern, color saturation, sharpness)
- Font consistency and accuracy
- Holographic pattern accuracy (if applicable)
- Card stock thickness indicators
- Centering and cut quality
- Color matching against known authentic samples
- Edge quality and consistency
- Any signs of reprinting, rebacking, or trimming

Respond in EXACTLY this JSON format:
{
  "authenticityScore": <number 0-100, where 100 = definitely authentic>,
  "flags": ["list of specific concerns found"],
  "positiveIndicators": ["list of authenticity markers detected"],
  "analysis": "<detailed 2-3 sentence assessment>",
  "verdict": "<authentic|suspicious|counterfeit>"
}

Be thorough but fair. Most items ARE authentic. Only flag as suspicious/counterfeit with clear evidence.
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
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: imageData },
              },
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

    let parsed;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      parsed = null;
    }

    const result = {
      aiScore: parsed?.authenticityScore ?? 0,
      flags: parsed?.flags ?? [],
      positiveIndicators: parsed?.positiveIndicators ?? [],
      analysis: parsed?.analysis ?? "Unable to analyze",
      verdict: parsed?.verdict ?? "suspicious",
    };

    // Store in DB
    const supabase = await createServiceRoleClient();
    const { data: authRecord } = await supabase
      .from("authentications")
      .insert({
        item_id: itemId ?? null,
        image_urls: imageUrls,
        category,
        status: "ai_reviewed",
        ai_score: result.aiScore,
        ai_analysis: result.analysis,
        ai_flags: result.flags,
        final_verdict: result.verdict,
        final_confidence: result.aiScore,
      })
      .select()
      .single();

    return NextResponse.json({
      ...result,
      authenticationId: authRecord?.id,
      status: "ai_reviewed",
      nextStep: "community_review",
    });
  } catch (err) {
    console.error("Auth check error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
