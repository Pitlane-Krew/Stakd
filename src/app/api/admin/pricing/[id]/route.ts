import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAuditEvent, getClientIp } from "@/lib/audit";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { parseBody } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  is_enabled: z.boolean().optional(),
  priority: z.number().int().min(1).optional(),
  refresh_interval_hours: z.number().int().min(1).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await requireAdmin("pricing.manage");
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;

  const bodyResult = await parseBody(request, schema);
  if ("error" in bodyResult) return bodyResult.error;

  const supabase = await createServiceRoleClient();
  const { data: current } = await supabase
    .from("price_source_configs")
    .select("source_name, is_enabled")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("price_source_configs")
    .update({ ...bodyResult.data, updated_at: new Date().toISOString() } as any)
    .eq("id", id);

  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  await logAuditEvent({
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "price_source.toggle",
    targetType: "price_source",
    targetId: current?.source_name ?? id,
    payload: { before: current, after: bodyResult.data },
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ success: true });
}
