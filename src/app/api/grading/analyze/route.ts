import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getApiUser, checkRateLimit } from "@/lib/api-auth";

/**
 * POST /api/grading/analyze
 *
 * AI Grading Analyzer — Uses Claude Vision to analyze card/collectible photos
 * and predict grade + ROI of professional grading.
 *
 * This is the data collection engine for STAKD's future grading service.
 * Every analysis creates a training data point.
 *
 * Body: { imageUrl: string, category: string, itemId?: string, metadata?: object }
 * Returns: { grade, confidence, subgrades, gradingROI, recommendation }
 */

interface GradingAnalysis {
  estimatedGrade: number; // 1-10 scale
  confidence: number; // 0-100%
  subgrades: {
    centering: number;
    corners: number;
    edges: number;
    surface: number;
  };
  defects: string[];
  recommendation: "worth_grading" | "borderline" | "not_worth_grading";
  gradingROI: {
    currentRawValue: number;
    estimatedGradedValue: number;
    gradingCost: number;
    estimatedProfit: number;
    roi: number;
  } | null;
  analysis: string; // Detailed natural language analysis
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { user, error: authError } = await getApiUser();
    if (authError) return authError;

    // Check rate limit (10 per hour)
    const { allowed, remaining } = await checkRateLimit(user!.id, "ai_grade", 10);
    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again in an hour." },
        { status: 429, headers: { "X-RateLimit-Remaining": "0" } }
      );
    }

    const { imageUrl, category, itemId, metadata } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: "imageUrl is required" },
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

    // Fetch the image as base64
    let imageData: string;
    let mediaType: string;
    try {
      const imgRes = await fetch(imageUrl);
      const buffer = await imgRes.arrayBuffer();
      imageData = Buffer.from(buffer).toString("base64");
      mediaType = imgRes.headers.get("content-type") || "image/jpeg";
    } catch {
      return NextResponse.json(
        { error: "Failed to fetch image" },
        { status: 400 }
      );
    }

    // Claude Vision analysis
    const prompt = buildGradingPrompt(category);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20241022",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: imageData,
                },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Claude API error:", res.status, errText);
      return NextResponse.json(
        { error: "AI analysis failed" },
        { status: 502 }
      );
    }

    const data = await res.json();
    const responseText = data.content?.[0]?.text ?? "";

    // Parse the structured response
    const analysis = parseGradingResponse(responseText);

    // Store analysis as training data (crucial for future grading service)
    const supabase = await createServiceRoleClient();
    await supabase.from("grading_analyses").insert({
      item_id: itemId ?? null,
      image_url: imageUrl,
      category: category ?? null,
      estimated_grade: analysis.estimatedGrade,
      confidence: analysis.confidence,
      subgrades: analysis.subgrades,
      defects: analysis.defects,
      recommendation: analysis.recommendation,
      raw_analysis: responseText,
      metadata: metadata ?? null,
    });

    return NextResponse.json(analysis);
  } catch (err) {
    console.error("Grading analysis error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function buildGradingPrompt(category?: string): string {
  const categoryContext = category
    ? `This is a ${category} collectible.`
    : "This is a collectible item.";

  return `You are an expert collectible grading analyst with deep knowledge of PSA, BGS, and CGC grading standards. ${categoryContext}

Analyze this image and provide a grading assessment. Respond in EXACTLY this JSON format:

{
  "estimatedGrade": <number 1-10, e.g. 8.5>,
  "confidence": <number 0-100>,
  "subgrades": {
    "centering": <number 1-10>,
    "corners": <number 1-10>,
    "edges": <number 1-10>,
    "surface": <number 1-10>
  },
  "defects": ["list of specific defects noticed"],
  "recommendation": "<worth_grading|borderline|not_worth_grading>",
  "analysis": "<detailed 2-3 sentence analysis explaining the grade>"
}

Grading criteria:
- Centering: How well centered is the image/border? Look for left/right and top/bottom ratio.
- Corners: Are corners sharp and clean? Any whitening, bending, or wear?
- Edges: Are edges clean? Any chipping, whitening, or rough spots?
- Surface: Any scratches, print lines, ink marks, or surface damage?

Be conservative in your estimates — it's better to underestimate than overestimate.
If the image quality is poor, lower your confidence score accordingly.
Return ONLY the JSON object, no other text.`;
}

function parseGradingResponse(text: string): GradingAnalysis {
  try {
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      estimatedGrade: Number(parsed.estimatedGrade) || 7,
      confidence: Number(parsed.confidence) || 50,
      subgrades: {
        centering: Number(parsed.subgrades?.centering) || 7,
        corners: Number(parsed.subgrades?.corners) || 7,
        edges: Number(parsed.subgrades?.edges) || 7,
        surface: Number(parsed.subgrades?.surface) || 7,
      },
      defects: Array.isArray(parsed.defects) ? parsed.defects : [],
      recommendation: parsed.recommendation || "borderline",
      gradingROI: null, // Calculated separately with market data
      analysis: parsed.analysis || "Analysis unavailable",
    };
  } catch {
    return {
      estimatedGrade: 0,
      confidence: 0,
      subgrades: { centering: 0, corners: 0, edges: 0, surface: 0 },
      defects: ["Unable to analyze image"],
      recommendation: "not_worth_grading",
      gradingROI: null,
      analysis: "Failed to parse analysis. Please try again with a clearer image.",
    };
  }
}
