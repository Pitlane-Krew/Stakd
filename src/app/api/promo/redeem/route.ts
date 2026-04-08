import { NextRequest, NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * POST /api/promo/redeem — redeem a promo code
 * Body: { code: string }
 *
 * This is a public (authenticated) route — any logged-in user can redeem.
 */
export async function POST(request: NextRequest) {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) {
    return authError ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let code: string;
  try {
    const body = await request.json();
    code = String(body.code ?? "").trim().toUpperCase();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!code || code.length < 3) {
    return NextResponse.json({ error: "Please enter a valid promo code" }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();

  // Look up the code
  const { data: promo, error: lookupError } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("code", code)
    .eq("is_active", true)
    .single();

  if (lookupError || !promo) {
    return NextResponse.json({ error: "Invalid or expired promo code" }, { status: 404 });
  }

  // Check if code has expired
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return NextResponse.json({ error: "This promo code has expired" }, { status: 410 });
  }

  // Check if max uses reached
  if (promo.max_uses && promo.used_count >= promo.max_uses) {
    return NextResponse.json({ error: "This promo code has reached its maximum uses" }, { status: 410 });
  }

  // Check if user already redeemed this code
  const { data: existingRedemption } = await supabase
    .from("promo_redemptions")
    .select("id")
    .eq("promo_code_id", promo.id)
    .eq("user_id", user.id)
    .single();

  if (existingRedemption) {
    return NextResponse.json({ error: "You have already redeemed this code" }, { status: 409 });
  }

  // Calculate tier expiration
  const tierExpiresAt = promo.duration_days
    ? new Date(Date.now() + promo.duration_days * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // Update user profile
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      tier: promo.tier,
      tier_expires_at: tierExpiresAt,
      tier_granted_by: "promo",
      tier_grant_reason: `Promo code: ${code}`,
    })
    .eq("id", user.id);

  if (updateError) {
    console.error("Failed to apply promo code:", updateError);
    return NextResponse.json({ error: "Failed to apply promo code" }, { status: 500 });
  }

  // Record redemption
  await supabase.from("promo_redemptions").insert({
    promo_code_id: promo.id,
    user_id: user.id,
    tier_granted: promo.tier,
    tier_expires_at: tierExpiresAt,
  });

  // Increment usage count
  await supabase
    .from("promo_codes")
    .update({ used_count: promo.used_count + 1 })
    .eq("id", promo.id);

  return NextResponse.json({
    success: true,
    tier: promo.tier,
    expires_at: tierExpiresAt,
    message: `You've been upgraded to ${promo.tier.charAt(0).toUpperCase() + promo.tier.slice(1)}!${
      promo.duration_days ? ` Access expires in ${promo.duration_days} days.` : ""
    }`,
  });
}
