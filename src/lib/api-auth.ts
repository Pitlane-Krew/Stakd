import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Verify the authenticated user for API routes.
 * Returns the user if authenticated, or a 401 response.
 */
export async function getApiUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}, // API routes don't set cookies
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { user, error: null, supabase };
}

/**
 * Rate limiting check using Supabase.
 * Returns true if the request should be allowed.
 */
export async function checkRateLimit(
  userId: string,
  action: string,
  maxPerHour: number
): Promise<{ allowed: boolean; remaining: number }> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Count recent requests
  const { count } = await supabase
    .from("rate_limit_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", action)
    .gte("created_at", oneHourAgo);

  const used = count ?? 0;
  const remaining = Math.max(0, maxPerHour - used);

  if (used >= maxPerHour) {
    return { allowed: false, remaining: 0 };
  }

  // Log this request
  await supabase.from("rate_limit_events").insert({
    user_id: userId,
    action,
    created_at: new Date().toISOString(),
  });

  return { allowed: true, remaining: remaining - 1 };
}
