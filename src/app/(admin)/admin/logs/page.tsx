import { createServiceRoleClient } from "@/lib/supabase/server";
import { ScrollText } from "lucide-react";

async function getLogs(page = 1) {
  const supabase = await createServiceRoleClient();
  const limit = 30;
  const offset = (page - 1) * limit;

  const { data, count } = await supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  return { logs: data ?? [], total: count ?? 0 };
}

const ACTION_COLORS: Record<string, string> = {
  "user.ban": "text-red-400 bg-red-400/10",
  "user.suspend": "text-amber-400 bg-amber-400/10",
  "user.unsuspend": "text-emerald-400 bg-emerald-400/10",
  "user.tier_grant": "text-purple-400 bg-purple-400/10",
  "user.tier_revoke": "text-white/50 bg-white/5",
  "role.grant": "text-amber-400 bg-amber-400/10",
  "report.reviewed": "text-blue-400 bg-blue-400/10",
  "report.dismissed": "text-white/40 bg-white/5",
  "cms.page_publish": "text-emerald-400 bg-emerald-400/10",
  "setting.update": "text-white/60 bg-white/5",
};

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const { logs, total } = await getLogs(page);
  const totalPages = Math.ceil(total / 30);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ScrollText className="w-6 h-6 text-white/50" />
          Audit Logs
        </h1>
        <p className="text-sm text-white/50 mt-1">
          Complete record of all admin actions — {total.toLocaleString()} events
        </p>
      </div>

      <div className="bg-[#1a1a24] border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Action</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Actor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Target</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">IP</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-white/40 text-sm">
                    No audit events yet
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-medium ${ACTION_COLORS[log.action] ?? "text-white/60 bg-white/5"}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-xs text-white/70 font-mono truncate max-w-[100px]">{log.actor_id?.slice(0, 8)}...</p>
                        <p className="text-[10px] text-white/40 capitalize">{log.actor_role}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-[10px] text-white/50 capitalize">{log.target_type}</p>
                        <p className="text-[10px] text-white/30 font-mono">{log.target_id?.slice(0, 8)}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-white/40 font-mono">{log.ip_address ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-white/40 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
            <p className="text-xs text-white/40">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && (
                <a href={`/admin/logs?page=${page - 1}`} className="px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white bg-white/5 hover:bg-white/10">
                  Previous
                </a>
              )}
              {page < totalPages && (
                <a href={`/admin/logs?page=${page + 1}`} className="px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white bg-white/5 hover:bg-white/10">
                  Next
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
