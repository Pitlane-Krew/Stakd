import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { logAuditEvent, getClientIp } from "@/lib/audit";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { parseBody } from "@/lib/api";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["actioned", "dismissed", "reviewed"]),
  note: z.string().max(500).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reportId } = await params;

  const authResult = await requireAdmin("reports.review");
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;

  const bodyResult = await parseBody(request, schema);
  if ("error" in bodyResult) return bodyResult.error;
  const { status } = bodyResult.data;

  const supabase = await createServiceRoleClient();

  const { error } = await supabase
    .from("reports")
    .update({
      status,
      reviewed_by: ctx.userId,
      reviewed_at: new Date().toISOString(),
    } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .eq("id", reportId);

  if (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  await logAuditEvent({
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: status === "actioned" ? "report.reviewed" : "report.dismissed",
    targetType: "report",
    targetId: reportId,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ success: true });
}
