import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAuditEvent, getClientIp } from "@/lib/audit";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { z } from "zod";

const createSchema = z.object({
  code: z.string().min(3).max(30).regex(/^[A-Z0-9_-]+$/i, "Code must be alphanumeric, hyphens, or underscores"),
  tier: z.enum(["pro", "elite"]),
  duration_days: z.number().int().min(1).max(365).nullable().optional(),
  max_uses: z.number().int().min(1).max(10000).nullable().optional(),
  reason: z.string().max(200).optional(),
  expires_at: z.string().datetime().nullable().optional(),
});

/**
 * GET /api/admin/promo-codes — list all promo codes
 * POST /api/admin/promo-codes — create a new promo code
 */
export async function GET() {
  const result = await requireAdmin("plans.edit");
  if ("error" in result) return result.error;

  const supabase = await createServiceRoleClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .select("*, promo_redemptions(count)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ codes: data });
}

export async function POST(request: NextRequest) {
  const result = await requireAdmin("plans.edit");
  if ("error" in result) return result.error;
  const { ctx } = result;

  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof z.ZodError ? err.errors : "Invalid request" },
      { status: 400 }
    );
  }

  const supabase = await createServiceRoleClient();

  // Check for duplicate code
  const { data: existing } = await supabase
    .from("promo_codes")
    .select("id")
    .eq("code", body.code.toUpperCase())
    .single();

  if (existing) {
    return NextResponse.json({ error: "Code already exists" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("promo_codes")
    .insert({
      code: body.code.toUpperCase(),
      tier: body.tier,
      duration_days: body.duration_days ?? null,
      max_uses: body.max_uses ?? 1,
      reason: body.reason ?? "Influencer / reviewer access",
      expires_at: body.expires_at ?? null,
      created_by: ctx.userId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent({
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "coupon.create",
    targetType: "promo_code",
    targetId: data.id,
    payload: { after: { code: body.code.toUpperCase(), tier: body.tier, max_uses: body.max_uses } },
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ code: data }, { status: 201 });
}
