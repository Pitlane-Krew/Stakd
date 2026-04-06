import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/translate
 * Translates user-generated content using Claude API.
 *
 * Body: { text: string, targetLocale: string, sourceLocale?: string }
 * Returns: { translatedText: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { text, targetLocale, sourceLocale } = await request.json();

    if (!text || !targetLocale) {
      return NextResponse.json(
        { error: "text and targetLocale required" },
        { status: 400 }
      );
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { error: "Text too long (max 5000 chars)" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Translation service not configured" },
        { status: 503 }
      );
    }

    const localeNames: Record<string, string> = {
      en: "English",
      es: "Spanish",
      "zh-CN": "Simplified Chinese",
      ja: "Japanese",
    };

    const targetLang = localeNames[targetLocale] ?? targetLocale;
    const sourceLang = sourceLocale
      ? localeNames[sourceLocale] ?? sourceLocale
      : "auto-detect the source language";

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: `Translate the following text to ${targetLang}. ${sourceLang !== "auto-detect the source language" ? `The source language is ${sourceLang}.` : ""}

Return ONLY the translated text with no explanations, no quotes, no preamble. Preserve any formatting (line breaks, emojis, mentions).

This is a social post from a collectibles platform, so preserve collector-specific terminology appropriately.

Text to translate:
${text}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error("Claude API error:", res.status);
      return NextResponse.json(
        { error: "Translation service error" },
        { status: 502 }
      );
    }

    const data = await res.json();
    const translatedText =
      data.content?.[0]?.text ?? text;

    return NextResponse.json({ translatedText });
  } catch (err) {
    console.error("Translation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
