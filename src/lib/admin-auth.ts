/**
 * Admin authentication helpers — server-side only.
 *
 * Use these in API routes and Server Components inside /admin.
 * Never import this in client components.
 */

import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export type AdminRole = "super_admin" | "admin" | "moderator" | "support";

export interface AdminContext {
  userId: string;
  role: AdminRole;
}

// ── Permission matrix ────────────────────────────────────────
const PERMISSIONS: Record<string, AdminRole[]> = {
  // User management
  "users.read":     ["super_admin", "admin", "support"],
  "users.suspend":  ["super_admin", "admin"],
  "users.ban":      ["super_admin", "admin"],
  "users.delete":   ["super_admin"],

  // Role management
  "roles.grant":    ["super_admin"],
  "roles.revoke":   ["super_admin"],

  // Membership / billing
  "plans.edit":     ["super_admin", "admin"],
  "plans.grant":    ["super_admin", "admin"],
  "coupons.create": ["super_admin", "admin"],

  // Moderation
  "posts.moderate":    ["super_admin", "admin", "moderator"],
  "reports.review":    ["super_admin", "admin", "moderator", "support"],
  "restocks.moderate": ["super_admin", "admin", "moderator"],

  // CMS
  "cms.edit":    ["super_admin", "admin"],
  "cms.publish": ["super_admin", "admin"],
  "banners.manage": ["super_admin", "admin", "moderator"],

  // Analytics
  "analytics.view": ["super_admin", "admin"],

  // System
  "settings.edit":  ["super_admin"],
  "logs.view":      ["super_admin", "admin"],
  "system.view":    ["super_admin", "admin"],

  // Pricing data
  "pricing.manage": ["super_admin", "admin"],
};

export function can(role: AdminRole, permission: string): boolean {
  const allowed = PERMISSIONS[permission] ?? [];
  return allowed.includes(role);
}

// ── Get admin context from current session ───────────────────
export async function getAdminContext(): Promise<AdminContext | null> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const serviceClient = await createServiceRoleClient();
    const { data: roleRow } = await serviceClient
      .from("admin_roles")
      .select("role, expires_at")
      .eq("user_id", user.id)
      .single();

    if (!roleRow) return null;
    if (roleRow.expires_at && new Date(roleRow.expires_at) < new Date()) return null;

    return { userId: user.id, role: roleRow.role as AdminRole };
  } catch {
    return null;
  }
}

// ── Require admin — use in API routes ────────────────────────
export async function requireAdmin(
  permission?: string
): Promise<{ ctx: AdminContext } | { error: NextResponse }> {
  const ctx = await getAdminContext();

  if (!ctx) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized — admin access required" },
        { status: 401 }
      ),
    };
  }

  if (permission && !can(ctx.role, permission)) {
    return {
      error: NextResponse.json(
        { error: `Forbidden — requires permission: ${permission}` },
        { status: 403 }
      ),
    };
  }

  return { ctx };
}

// ── Require specific roles ────────────────────────────────────
export async function requireRole(
  allowedRoles: AdminRole[]
): Promise<{ ctx: AdminContext } | { error: NextResponse }> {
  const ctx = await getAdminContext();

  if (!ctx) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  if (!allowedRoles.includes(ctx.role)) {
    return {
      error: NextResponse.json(
        { error: "Forbidden — insufficient role" },
        { status: 403 }
      ),
    };
  }

  return { ctx };
}
