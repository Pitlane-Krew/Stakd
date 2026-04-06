import { createServiceRoleClient } from "@/lib/supabase/server";
import { Flag, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import ModerationActions from "@/components/admin/ModerationActions";

async function getReports() {
  const supabase = await createServiceRoleClient();
  const { data } = await supabase
    .from("reports")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export default async function ModerationPage() {
  const reports = await getReports();

  const byType = reports.reduce(
    (acc, r) => ({ ...acc, [r.target_type]: (acc[r.target_type] ?? 0) + 1 }),
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Moderation Queue</h1>
        <p className="text-sm text-white/50 mt-1">
          {reports.length} open report{reports.length !== 1 ? "s" : ""} awaiting review
        </p>
      </div>

      {/* Type breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(byType).map(([type, count]) => (
          <div key={type} className="bg-[#1a1a24] border border-white/10 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{count}</p>
            <p className="text-xs text-white/50 capitalize mt-1">{type}s</p>
          </div>
        ))}
        {Object.keys(byType).length === 0 && (
          <div className="col-span-4 bg-[#1a1a24] border border-white/10 rounded-xl p-8 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <p className="text-white/60 font-medium">Queue is clear</p>
            <p className="text-xs text-white/40 mt-1">No open reports</p>
          </div>
        )}
      </div>

      {/* Reports list */}
      {reports.length > 0 && (
        <div className="bg-[#1a1a24] border border-white/10 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
            <Flag className="w-4 h-4 text-white/50" />
            <h2 className="text-sm font-semibold text-white">Open Reports</h2>
          </div>
          <div className="divide-y divide-white/5">
            {reports.map((report) => (
              <div key={report.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/10 text-amber-400 uppercase">
                      {report.target_type}
                    </span>
                    <span className="text-xs text-white/40 font-mono truncate">{report.target_id}</span>
                  </div>
                  <p className="text-sm text-white font-medium">{report.reason}</p>
                  {report.details && (
                    <p className="text-xs text-white/50 mt-1 line-clamp-2">{report.details}</p>
                  )}
                  <p className="text-[10px] text-white/30 mt-2">
                    {new Date(report.created_at).toLocaleString()}
                  </p>
                </div>
                <ModerationActions reportId={report.id} targetType={report.target_type} targetId={report.target_id} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
