/**
 * Audit logging — server-side only.
 *
 * All admin and critical actions should call logAuditEvent().
 * Writes to the audit_logs table via service role (bypasses RLS).
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import type { AdminRole } from "@/lib/admin-auth";

export type AuditAction =
  // User management
  | "user.suspend"
  | "user.unsuspend"
  | "user.ban"
  | "user.unban"
  | "user.delete"
  | "user.tier_grant"
  | "user.tier_revoke"
  // Roles
  | "role.grant"
  | "role.revoke"
  // Moderation
  | "post.remove"
  | "post.restore"
  | "comment.remove"
  | "restock.remove"
  | "report.reviewed"
  | "report.dismissed"
  // Plans & billing
  | "plan.create"
  | "plan.update"
  | "coupon.create"
  | "coupon.deactivate"
  // CMS
  | "cms.page_update"
  | "cms.page_publish"
  | "cms.announcement_create"
  | "cms.announcement_toggle"
  // System
  | "setting.update"
  | "price_source.toggle"
  | "price_source.refresh";

export interface AuditPayload {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export interface AuditEventInput {
  actorId: string;
  actorRole: AdminRole;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  payload?: AuditPayload;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAuditEvent(event: AuditEventInput): Promise<void> {
  try {
    const supabase = await createServiceRoleClient();
    await supabase.from("audit_logs").insert({
      actor_id: event.actorId,
      actor_role: event.actorRole,
      action: event.action,
      target_type: event.targetType ?? null,
      target_id: event.targetId ?? null,
      payload: event.payload ?? {},
      ip_address: event.ipAddress ?? null,
      user_agent: event.userAgent ?? null,
    });
  } catch (err) {
    // Audit logging should never crash the main request
    console.error("[AUDIT] Failed to write audit log:", err);
  }
}

// Helper to extract IP from request headers
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
