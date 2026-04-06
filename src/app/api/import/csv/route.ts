import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/import/csv
 *
 * Bulk CSV import — accepts CSV text, parses it, AI-enriches
 * incomplete data, and returns structured items ready for insert.
 *
 * Supports flexible column mapping:
 * - name/title, category, year, condition, grade, value/price, brand
 * - Plus any extra columns mapped to attributes
 *
 * Body: { csvText: string, category?: string, collectionId: string }
 */

interface ParsedRow {
  name: string;
  category?: string;
  year?: number;
  condition?: string;
  grade_value?: string;
  grading_company?: string;
  estimated_value?: number;
  purchase_price?: number;
  brand?: string;
  tags?: string[];
  attributes: Record<string, unknown>;
  _enriched?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { csvText, category, collectionId } = await request.json();

    if (!csvText || !collectionId) {
      return NextResponse.json(
        { error: "csvText and collectionId required" },
        { status: 400 }
      );
    }

    // Parse CSV
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) {
      return NextResponse.json(
        { error: "CSV must have a header row and at least one data row" },
        { status: 400 }
      );
    }

    const headers = lines[0]
      .split(",")
      .map((h: string) => h.trim().toLowerCase().replace(/['"]/g, ""));

    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0) continue;

      const row: ParsedRow = { name: "", attributes: {} };

      headers.forEach((header: string, idx: number) => {
        const val = values[idx]?.trim() ?? "";
        if (!val) return;

        // Map common column names
        switch (header) {
          case "name":
          case "title":
          case "card_name":
          case "item":
            row.name = val;
            break;
          case "category":
          case "type":
            row.category = val;
            break;
          case "year":
            row.year = parseInt(val) || undefined;
            break;
          case "condition":
            row.condition = mapCondition(val);
            break;
          case "grade":
          case "grade_value":
            row.grade_value = val;
            break;
          case "grading_company":
          case "grader":
            row.grading_company = val.toUpperCase();
            break;
          case "value":
          case "estimated_value":
          case "market_value":
            row.estimated_value = parseFloat(val.replace(/[$,]/g, "")) || undefined;
            break;
          case "price":
          case "purchase_price":
          case "cost":
          case "paid":
            row.purchase_price = parseFloat(val.replace(/[$,]/g, "")) || undefined;
            break;
          case "brand":
            row.brand = val;
            break;
          case "tags":
            row.tags = val.split(/[;|]/).map((t: string) => t.trim());
            break;
          default:
            // Everything else goes into attributes
            row.attributes[header] = val;
            break;
        }
      });

      if (row.name) {
        if (category && !row.category) row.category = category;
        rows.push(row);
      }
    }

    // AI enrichment for rows missing data
    const apiKey = process.env.ANTHROPIC_API_KEY;
    let enrichedRows = rows;

    if (apiKey && rows.some((r) => !r.estimated_value || !r.category)) {
      enrichedRows = await enrichWithAI(rows, apiKey);
    }

    return NextResponse.json({
      parsed: enrichedRows.length,
      skipped: lines.length - 1 - enrichedRows.length,
      items: enrichedRows,
      collectionId,
    });
  } catch (err) {
    console.error("CSV import error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function mapCondition(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("mint") && !lower.includes("near")) return "mint";
  if (lower.includes("near") || lower === "nm") return "near_mint";
  if (lower.includes("excellent") || lower === "ex") return "excellent";
  if (lower.includes("good") || lower === "gd") return "good";
  if (lower.includes("poor") || lower === "pr") return "poor";
  if (lower.includes("graded") || lower.includes("slab")) return "graded";
  if (lower.includes("raw")) return "raw";
  if (lower.includes("sealed")) return "sealed";
  return "raw";
}

async function enrichWithAI(
  rows: ParsedRow[],
  apiKey: string
): Promise<ParsedRow[]> {
  // Batch up to 50 items for enrichment
  const batch = rows.slice(0, 50);
  const summaries = batch.map((r, i) => `${i}: "${r.name}" (${r.category || "unknown"})`).join("\n");

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 3000,
        messages: [
          {
            role: "user",
            content: `You are a collectibles expert. For each item below, provide the missing data.

Items:
${summaries}

Return a JSON array where each element has: { "index": <number>, "category": "<if missing>", "estimatedValue": <USD number or null>, "year": <number or null> }

Only include items that need enrichment. Return ONLY the JSON array.`,
          },
        ],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const text = data.content?.[0]?.text ?? "";
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const enrichments = JSON.parse(jsonMatch[0]);
        for (const e of enrichments) {
          const row = batch[e.index];
          if (!row) continue;
          if (e.category && !row.category) row.category = e.category;
          if (e.estimatedValue && !row.estimated_value)
            row.estimated_value = e.estimatedValue;
          if (e.year && !row.year) row.year = e.year;
          row._enriched = true;
        }
      }
    }
  } catch {
    // Enrichment is best-effort
  }

  return rows;
}
