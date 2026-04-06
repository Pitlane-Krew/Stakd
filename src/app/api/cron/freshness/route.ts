import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createServiceRoleClient();
    await supabase.rpc("refresh_freshness_scores");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Freshness cron failed:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
