import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { rateLimit, paginationSchema } from "@/lib/api";
import { z } from "zod";

const filterSchema = paginationSchema.extend({
  search: z.string().optional(),
  status: z.enum(["active", "suspended", "banned"]).optional(),
  tier: z.enum(["free", "pro", "elite"]).optional(),
});

export async function GET(request: NextRequest) {
  // Rate limit
  const { allowed } = rateLimit(request, "admin");
  if (!allowed) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

  // Auth
  const result = await requireAdmin("users.read");
  if ("error" in result) return result.error;

  // Parse query params
  const url = new URL(request.url);
  const parsed = filterSchema.safeParse({
    page: url.searchParams.get("page"),
    limit: url.searchParams.get("limit"),
    search: url.searchParams.get("search") || undefined,
    status: url.searchParams.get("status") || undefined,
    tier: url.searchParams.get("tier") || undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid params" }, { status: 422 });
  }

  const { page, limit, search, status, tier } = parsed.data;
  const offset = (page - 1) * limit;

  const supabase = await createServiceRoleClient();

  let query = supabase
    .from("profiles")
    .select("id, username, display_name, tier, status, reputation_score, total_trades, created_at, last_sign_in_at, flagged_count", { count: "exact" });

  if (search) {
    query = query.or(`username.ilike.%${search}%,display_name.ilike.%${search}%`);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (tier) {
    query = query.eq("tier", tier);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[admin/users GET]", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [], total: count ?? 0 });
}
