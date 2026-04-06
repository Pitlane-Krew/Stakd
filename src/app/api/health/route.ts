import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * GET /api/health
 * Uptime monitoring endpoint. Returns system status.
 * Public — no auth required.
 */
export async function GET() {
  const ts = new Date().toISOString();

  try {
    // Quick DB connectivity check
    const supabase = await createServiceRoleClient();
    const { error } = await supabase
      .from("system_settings")
      .select("key")
      .eq("key", "maintenance_mode")
      .single();

    if (error) {
      return NextResponse.json(
        { status: "degraded", db: "error", ts, error: error.message },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { status: "ok", db: "ok", ts },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { status: "error", db: "unreachable", ts },
      { status: 503 }
    );
  }
}
