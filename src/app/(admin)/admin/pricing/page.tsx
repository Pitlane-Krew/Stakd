import { createServiceRoleClient } from "@/lib/supabase/server";
import { Database, RefreshCw, Power } from "lucide-react";
import PriceSourceToggle from "@/components/admin/PriceSourceToggle";

async function getPriceData() {
  const supabase = await createServiceRoleClient();
  const { data } = await supabase
    .from("price_source_configs")
    .select("*")
    .order("priority");
  return data ?? [];
}

export default async function PricingDataPage() {
  const sources = await getPriceData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Database className="w-6 h-6 text-white/50" />
          Pricing Data
        </h1>
        <p className="text-sm text-white/50 mt-1">
          Control which price sources are active and their priority order.
        </p>
      </div>

      <div className="space-y-3">
        {sources.map((source) => (
          <div key={source.id} className="bg-[#1a1a24] border border-white/10 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${source.is_enabled ? "bg-emerald-400" : "bg-white/20"}`} />
                  <h3 className="font-semibold text-white">{source.display_name}</h3>
                  <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded font-mono">
                    Priority {source.priority}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-white/40">
                  <span>Refreshes every {source.refresh_interval_hours}h</span>
                  <span>
                    Last refresh: {source.last_refresh_at
                      ? new Date(source.last_refresh_at).toLocaleString()
                      : "Never"}
                  </span>
                  {source.error_count > 0 && (
                    <span className="text-red-400">{source.error_count} error{source.error_count !== 1 ? "s" : ""}</span>
                  )}
                </div>
                {source.last_error && (
                  <p className="mt-2 text-xs text-red-400/80 bg-red-400/5 px-3 py-2 rounded font-mono">
                    {source.last_error}
                  </p>
                )}
              </div>
              <PriceSourceToggle
                sourceId={source.id}
                sourceName={source.source_name}
                isEnabled={source.is_enabled}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
