import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAuditEvent, getClientIp } from "@/lib/audit";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { parseBody } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  key: z.string().min(1).max(100),
  value: z.string(),
});

export async function PATCH(request: NextRequest) {
  const authResult = await requireAdmin("settings.edit");
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;

  const bodyResult = await parseBody(request, schema);
  if ("error" in bodyResult) return bodyResult.error;
  const { key, value } = bodyResult.data;

  // Coerce value to appropriate JSON type
  let jsonValue: unknown = value;
  if (value === "true") jsonValue = true;
  else if (value === "false") jsonValue = false;
  else if (!isNaN(Number(value)) && value !== "") jsonValue = Number(value);

  const supabase = await createServiceRoleClient();

  const { data: current } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", key)
    .single();

  const { error } = await supabase
    .from("system_settings")
    .update({
      value: jsonValue as any,
      updated_by: ctx.userId,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("key", key);

  if (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  await logAuditEvent({
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "setting.update",
    targetType: "setting",
    targetId: key,
    payload: { before: { value: current?.value }, after: { value: jsonValue } },
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ success: true });
}
