import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * GET /api/search
 * Full-text search across items, profiles, and restocks
 *
 * Query Parameters:
 * - q: Search query (required)
 * - type: 'items' | 'profiles' | 'restocks' | 'all' (default: 'all')
 * - category: Filter items by category (optional)
 * - limit: Results per page (default: 20, max: 100)
 * - offset: Pagination offset (default: 0)
 */

interface SearchResult {
  id: string;
  type: "item" | "profile" | "restock";
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  relevanceScore: number;
}

interface SearchResponse {
  success: boolean;
  results: SearchResult[];
  total: number;
  timestamp: string;
}

// Rate limit: 30 searches per minute per user/IP
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 30;

async function checkRateLimit(
  userId: string | null,
  clientIp: string
): Promise<boolean> {
  const supabase = await createServiceRoleClient();
  const key = userId || clientIp;
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW);

  try {
    // Get or create rate limit record
    const { data: existing } = await supabase
      .from("search_rate_limits")
      .select("search_count, window_start")
      .eq("user_id", userId || "00000000-0000-0000-0000-000000000000")
      .gte("window_start", windowStart.toISOString())
      .single();

    if (existing && existing.search_count >= RATE_LIMIT_MAX) {
      return false;
    }

    // Increment counter
    if (existing) {
      await supabase
        .from("search_rate_limits")
        .update({ search_count: existing.search_count + 1 })
        .eq("user_id", userId || "00000000-0000-0000-0000-000000000000")
        .eq("window_start", existing.window_start);
    } else if (userId) {
      await supabase.from("search_rate_limits").insert({
        user_id: userId,
        search_count: 1,
        window_start: now.toISOString(),
      });
    }

    return true;
  } catch {
    // If rate limiting fails, allow the request through
    return true;
  }
}

async function searchItems(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  query: string,
  category?: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ results: SearchResult[]; total: number }> {
  try {
    // Build the query
    const plainQuery = query.replace(/[&|!]/g, " ").trim();
    const tsquery = `${plainQuery.split(" ").join(" & ")}:*`;

    let dbQuery = supabase
      .from("items")
      .select("id, title, brand, category, description, image_urls", {
        count: "exact",
      })
      .eq("is_for_sale", true);

    // Add category filter if provided
    if (category) {
      dbQuery = dbQuery.eq("category", category);
    }

    // Full-text search using tsvector + trigram similarity fallback
    const { data: searchResults, count } = await dbQuery
      .or(
        `search_vector.fts.${tsquery},title.ilike.%${query}%,brand.ilike.%${query}%`
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const results: SearchResult[] = (searchResults || []).map((item: any) => ({
      id: item.id,
      type: "item" as const,
      title: item.title,
      subtitle: item.brand,
      description: item.description,
      imageUrl: item.image_urls?.[0],
      relevanceScore:
        item.title.toLowerCase().includes(query.toLowerCase()) ? 1.0 : 0.7,
    }));

    return { results, total: count || 0 };
  } catch (error) {
    console.error("Error searching items:", error);
    return { results: [], total: 0 };
  }
}

async function searchProfiles(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  query: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ results: SearchResult[]; total: number }> {
  try {
    const plainQuery = query.replace(/[&|!]/g, " ").trim();
    const tsquery = `${plainQuery.split(" ").join(" & ")}:*`;

    const { data: searchResults, count } = await supabase
      .from("profiles")
      .select("id, username, display_name, bio, avatar_url", {
        count: "exact",
      })
      .eq("is_public", true)
      .or(
        `search_vector.fts.${tsquery},username.ilike.%${query}%,display_name.ilike.%${query}%`
      )
      .order("username", { ascending: true })
      .range(offset, offset + limit - 1);

    const results: SearchResult[] = (searchResults || []).map((profile: any) => ({
      id: profile.id,
      type: "profile" as const,
      title: profile.display_name || profile.username,
      subtitle: `@${profile.username}`,
      description: profile.bio,
      imageUrl: profile.avatar_url,
      relevanceScore:
        profile.username.toLowerCase() === query.toLowerCase() ? 1.0 : 0.8,
    }));

    return { results, total: count || 0 };
  } catch (error) {
    console.error("Error searching profiles:", error);
    return { results: [], total: 0 };
  }
}

async function searchRestocks(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  query: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ results: SearchResult[]; total: number }> {
  try {
    const plainQuery = query.replace(/[&|!]/g, " ").trim();
    const tsquery = `${plainQuery.split(" ").join(" & ")}:*`;

    const { data: searchResults, count } = await supabase
      .from("restocks")
      .select("id, store_name, item_found, description, image_url, freshness_score", {
        count: "exact",
      })
      .gt("freshness_score", 0)
      .or(
        `search_vector.fts.${tsquery},store_name.ilike.%${query}%,item_found.ilike.%${query}%`
      )
      .order("freshness_score", { ascending: false })
      .range(offset, offset + limit - 1);

    const results: SearchResult[] = (searchResults || []).map((restock: any) => ({
      id: restock.id,
      type: "restock" as const,
      title: restock.store_name,
      subtitle: restock.item_found,
      description: restock.description,
      imageUrl: restock.image_url,
      relevanceScore: (restock.freshness_score / 10) * 0.5 + 0.5,
    }));

    return { results, total: count || 0 };
  } catch (error) {
    console.error("Error searching restocks:", error);
    return { results: [], total: 0 };
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q")?.trim();
    const searchType = (searchParams.get("type") || "all") as
      | "items"
      | "profiles"
      | "restocks"
      | "all";
    const category = searchParams.get("category");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Validate query
    if (!query || query.length === 0) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    if (query.length < 2) {
      return NextResponse.json(
        { error: "Search query must be at least 2 characters" },
        { status: 400 }
      );
    }

    // Get client IP for rate limiting
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Check rate limit
    // TODO: Implement proper user ID extraction from auth
    const isAllowed = await checkRateLimit(null, clientIp);
    if (!isAllowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Maximum 30 searches per minute." },
        { status: 429 }
      );
    }

    const supabase = await createServiceRoleClient();
    const startTime = Date.now();

    let allResults: SearchResult[] = [];
    let totalCount = 0;

    // Execute searches based on type
    if (searchType === "all" || searchType === "items") {
      const { results, total } = await searchItems(
        supabase,
        query,
        category,
        limit,
        offset
      );
      allResults.push(...results);
      totalCount += total;
    }

    if (searchType === "all" || searchType === "profiles") {
      const { results, total } = await searchProfiles(
        supabase,
        query,
        limit,
        offset
      );
      allResults.push(...results);
      totalCount += total;
    }

    if (searchType === "all" || searchType === "restocks") {
      const { results, total } = await searchRestocks(
        supabase,
        query,
        limit,
        offset
      );
      allResults.push(...results);
      totalCount += total;
    }

    // Sort by relevance score if searching all
    if (searchType === "all") {
      allResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
      allResults = allResults.slice(0, limit);
    }

    const responseTime = Date.now() - startTime;

    // Log search (non-blocking)
    // TODO: Extract user ID from auth and log searches
    supabase
      .from("search_logs")
      .insert({
        query,
        search_type: searchType,
        result_count: allResults.length,
        response_time_ms: responseTime,
      })
      .catch((error) => console.error("Failed to log search:", error));

    const response: SearchResponse = {
      success: true,
      results: allResults,
      total: totalCount,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, max-age=30",
        "X-Response-Time": `${responseTime}ms`,
      },
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      {
        error: "Search failed. Please try again.",
        success: false,
        results: [],
        total: 0,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
