import { createServiceRoleClient } from "@/lib/supabase/server";
import { Settings, Activity, Database, Clock } from "lucide-react";
import SystemSettingsEditor from "@/components/admin/SystemSettingsEditor";

async function getSystemData() {
  const supabase = await createServiceRoleClient();

  const [settingsRes, priceSourcesRes] = await Promise.all([
    supabase.from("system_settings").select("*").order("key"),
    supabase
      .from("price_source_configs")
      .select("*")
      .order("priority"),
  ]);

  return {
    settings: settingsRes.data ?? [],
    priceSources: priceSourcesRes.data ?? [],
  };
}

export default async function SystemPage() {
  const { settings, priceSources } = await getSystemData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-white/50" />
          System
        </h1>
        <p className="text-sm text-white/50 mt-1">
          Platform-wide settings, data source health, and job monitoring.
        </p>
      </div>

      {/* System Settings */}
      <div>
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
          Platform Settings
        </h2>
        <div className="bg-[#1a1a24] border border-white/10 rounded-xl overflow-hidden">
          <SystemSettingsEditor settings={settings} />
        </div>
      </div>

      {/* Price Source Health */}
      <div>
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Database className="w-4 h-4" />
          Price Data Sources
        </h2>
        <div className="space-y-3">
          {priceSources.map((source) => {
            const hasError = source.error_count > 0;
            const isStale = source.last_refresh_at
              ? Date.now() - new Date(source.last_refresh_at).getTime() > (source.refresh_interval_hours + 2) * 60 * 60 * 1000
              : source.source_name !== "manual";

            const statusColor = !source.is_enabled
              ? "bg-white/10"
              : hasError
              ? "bg-red-400"
              : isStale
              ? "bg-amber-400"
              : "bg-emerald-400";

            return (
              <div key={source.id} className="bg-[#1a1a24] border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${statusColor}`} />
                    <div>
                      <p className="font-semibold text-white text-sm">{source.display_name}</p>
                      <p className="text-xs text-white/40">
                        Priority {source.priority} · Refreshes every {source.refresh_interval_hours}h
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/50">
                      {source.last_refresh_at
                        ? `Last: ${new Date(source.last_refresh_at).toLocaleString()}`
                        : "Never refreshed"}
                    </p>
                    {hasError && (
                      <p className="text-xs text-red-400 mt-0.5">{source.error_count} error{source.error_count !== 1 ? "s" : ""}</p>
                    )}
                  </div>
                </div>
                {source.last_error && (
                  <p className="mt-2 text-xs text-red-400/80 bg-red-400/5 px-3 py-2 rounded-lg font-mono">
                    {source.last_error}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Cron jobs */}
      <div>
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Cron Jobs
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { name: "Price Refresh", endpoint: "/api/cron/prices", schedule: "Every 12h", description: "Fetches latest market prices from eBay and other sources" },
            { name: "Freshness Decay", endpoint: "/api/cron/freshness", schedule: "Every 6h", description: "Decays restock freshness scores over time" },
          ].map((job) => (
            <div key={job.endpoint} className="bg-[#1a1a24] border border-white/10 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="font-medium text-white text-sm">{job.name}</p>
                <span className="text-[10px] text-white/40 font-mono bg-white/5 px-2 py-0.5 rounded">
                  {job.schedule}
                </span>
              </div>
              <p className="text-xs text-white/50 mb-3">{job.description}</p>
              <p className="text-[10px] text-white/30 font-mono">{job.endpoint}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
