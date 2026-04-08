import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAuditEvent, getClientIp } from "@/lib/audit";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { parseBody } from "@/lib/api";
import { z } from "zod";

const actionSchema = z.object({
  action: z.enum(["suspend", "unsuspend", "ban", "restore", "grant_pro", "grant_elite", "revoke_tier"]),
  reason: z.string().max(500).optional(),
  suspend_days: z.number().int().min(1).max(365).optional(),
  /** Number of days the comp'd tier lasts. Omit or 0 for indefinite. */
  tier_duration_days: z.number().int().min(0).max(365).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetUserId } = await params;

  // Auth
  const result = await requireAdmin("users.suspend");
  if ("error" in result) return result.error;
  const { ctx } = result;

  // Parse body
  const bodyResult = await parseBody(request, actionSchema);
  if ("error" in bodyResult) return bodyResult.error;
  const { action, reason, suspend_days, tier_duration_days } = bodyResult.data;

  const supabase = await createServiceRoleClient();

  // Get current user state for audit diff
  const { data: currentUser } = await supabase
    .from("profiles")
    .select("status, tier, suspended_until, suspension_reason")
    .eq("id", targetUserId)
    .single();

  if (!currentUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let updatePayload: Record<string, unknown> = {};
  let auditAction: Parameters<typeof logAuditEvent>[0]["action"];

  switch (action) {
    case "suspend":
    case "unsuspend": {
      // Requires suspend permission
      if (action === "suspend" && !["super_admin", "admin"].includes(ctx.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const suspendUntil = suspend_days
        ? new Date(Date.now() + suspend_days * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // default 7 days
      updatePayload = {
        status: "suspended",
        suspended_until: suspendUntil,
        suspension_reason: reason ?? "Policy violation",
      };
      auditAction = "user.suspend";
      break;
    }
    case "ban": {
      if (ctx.role !== "super_admin" && ctx.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      updatePayload = {
        status: "banned",
        ban_reason: reason ?? "Policy violation",
        suspended_until: null,
      };
      auditAction = "user.ban";
      break;
    }
    case "restore": {
      updatePayload = {
        status: "active",
        suspended_until: null,
        suspension_reason: null,
        ban_reason: null,
      };
      auditAction = "user.unsuspend";
      break;
    }
    case "grant_pro": {
      const expiresAt = tier_duration_days
        ? new Date(Date.now() + tier_duration_days * 24 * 60 * 60 * 1000).toISOString()
        : null;
      updatePayload = {
        tier: "pro",
        tier_expires_at: expiresAt,
        tier_granted_by: "admin",
        tier_grant_reason: reason ?? "Admin comp",
      };
      auditAction = "user.tier_grant";
      break;
    }
    case "grant_elite": {
      const expiresAt = tier_duration_days
        ? new Date(Date.now() + tier_duration_days * 24 * 60 * 60 * 1000).toISOString()
        : null;
      updatePayload = {
        tier: "elite",
        tier_expires_at: expiresAt,
        tier_granted_by: "admin",
        tier_grant_reason: reason ?? "Admin comp",
      };
      auditAction = "user.tier_grant";
      break;
    }
    case "revoke_tier": {
      updatePayload = {
        tier: "free",
        tier_expires_at: null,
        tier_granted_by: null,
        tier_grant_reason: null,
      };
      auditAction = "user.tier_revoke";
      break;
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update(updatePayload as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .eq("id", targetUserId);

  if (error) {
    console.error("[admin/users PATCH]", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  // Log audit
  await logAuditEvent({
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: auditAction,
    targetType: "user",
    targetId: targetUserId,
    payload: { before: currentUser, after: updatePayload, meta: { reason } },
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  return NextResponse.json({ success: true });
}
