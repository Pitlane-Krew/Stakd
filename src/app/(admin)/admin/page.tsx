import {
  Users,
  CreditCard,
  ShieldAlert,
  Activity,
  TrendingUp,
  Database,
  AlertTriangle,
} from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/server";
import StatsCard from "@/components/admin/StatsCard";
import Link from "next/link";

async function getDashboardStats() {
  const supabase = await createServiceRoleClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [
    totalUsersRes,
    newUsersThisWeekRes,
    newUsersLastWeekRes,
    activeSubsRes,
    openReportsRes,
    recentAuditRes,
    priceSourcesRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", fourteenDaysAgo).lt("created_at", sevenDaysAgo),
    supabase.from("profiles").select("id", { count: "exact", head: true }).neq("tier", "free"),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("audit_logs").select("id, action, created_at, actor_role").order("created_at", { ascending: false }).limit(8),
    supabase.from("price_source_configs").select("source_name, is_enabled, last_refresh_at, error_count, last_error"),
  ]);

  const thisWeek = newUsersThisWeekRes.count ?? 0;
  const lastWeek = newUsersLastWeekRes.count ?? 0;
  const growthPct = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : null;

  return {
    totalUsers: totalUsersRes.count ?? 0,
    newUsersThisWeek: thisWeek,
    userGrowth: growthPct,
    activeSubs: activeSubsRes.count ?? 0,
    openReports: openReportsRes.count ?? 0,
    recentAudit: recentAuditRes.data ?? [],
    priceSources: priceSourcesRes.data ?? [],
  };
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  const alertingSources = stats.priceSources.filter(
    (s) => s.is_enabled && (s.error_count > 0 || !s.last_refresh_at)
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-sm text-white/50 mt-1">
          Platform overview — {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Alerts */}
      {(stats.openReports > 0 || alertingSources.length > 0) && (
        <div className="space-y-2">
          {stats.openReports > 0 && (
            <Link
              href="/admin/moderation"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/15 transition-colors"
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">
                {stats.openReports} open report{stats.openReports !== 1 ? "s" : ""} awaiting review
              </span>
            </Link>
          )}
          {alertingSources.map((s) => (
            <Link
              key={s.source_name}
              href="/admin/pricing"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/15 transition-colors"
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">
                Price source &quot;{s.source_name}&quot; has errors — {s.last_error ?? "check configuration"}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Total Users"
          value={stats.totalUsers.toLocaleString()}
          iconName="Users"
          color="#7c3aed"
          change={stats.userGrowth ?? undefined}
        />
        <StatsCard
          label="New This Week"
          value={stats.newUsersThisWeek}
          iconName="TrendingUp"
          color="#10b981"
        />
        <StatsCard
          label="Paid Members"
          value={stats.activeSubs}
          iconName="CreditCard"
          color="#f59e0b"
        />
        <StatsCard
          label="Open Reports"
          value={stats.openReports}
          iconName="ShieldAlert"
          color={stats.openReports > 0 ? "#ef4444" : "#6b7280"}
        />
      </div>

      {/* Two-column: recent activity + data sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent audit activity */}
        <div className="bg-[#1a1a24] border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-white/50" />
              Recent Admin Activity
            </h2>
            <Link href="/admin/logs" className="text-xs text-[var(--color-accent)] hover:underline">
              View all
            </Link>
          </div>
          {stats.recentAudit.length === 0 ? (
            <p className="text-sm text-white/40 text-center py-6">No recent activity</p>
          ) : (
            <div className="space-y-2">
              {stats.recentAudit.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-xs font-medium text-white/80 font-mono">{log.action}</p>
                    <p className="text-[10px] text-white/40">{log.actor_role}</p>
                  </div>
                  <p className="text-[10px] text-white/40">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Price source health */}
        <div className="bg-[#1a1a24] border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-white/50" />
              Price Source Health
            </h2>
            <Link href="/admin/pricing" className="text-xs text-[var(--color-accent)] hover:underline">
              Manage
            </Link>
          </div>
          <div className="space-y-2">
            {stats.priceSources.map((source) => {
              const hasError = source.error_count > 0;
              const isStale = source.last_refresh_at
                ? Date.now() - new Date(source.last_refresh_at).getTime() > 26 * 60 * 60 * 1000
                : true;

              return (
                <div key={source.source_name} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        !source.is_enabled
                          ? "bg-white/20"
                          : hasError
                          ? "bg-red-400"
                          : isStale
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                      }`}
                    />
                    <span className="text-xs font-medium text-white/70 capitalize">
                      {source.source_name}
                    </span>
                  </div>
                  <span className="text-[10px] text-white/40">
                    {!source.is_enabled
                      ? "disabled"
                      : hasError
                      ? `${source.error_count} error${source.error_count !== 1 ? "s" : ""}`
                      : source.last_refresh_at
                      ? new Date(source.last_refresh_at).toLocaleTimeString()
                      : "never"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/admin/users", label: "Manage Users", iconName: "Users" },
          { href: "/admin/moderation", label: "Moderation Queue", iconName: "ShieldAlert" },
          { href: "/admin/memberships", label: "Memberships", iconName: "CreditCard" },
          { href: "/admin/logs", label: "Audit Logs", iconName: "Activity" },
        ].map(({ href, label, iconName }) => {
          const IconMap: Record<string, typeof Users> = { Users, ShieldAlert, CreditCard, Activity };
          const Icon = IconMap[iconName] ?? Activity;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 p-4 bg-[#1a1a24] border border-white/10 rounded-xl hover:border-white/20 transition-colors text-center group"
            >
              <Icon className="w-5 h-5 text-white/40 group-hover:text-white/70 transition-colors" />
              <span className="text-xs text-white/60 group-hover:text-white/90 transition-colors font-medium">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
