import { createServiceRoleClient } from "@/lib/supabase/server";
import { BarChart3, Users, TrendingUp, ArrowUpRight } from "lucide-react";

async function getAnalytics() {
  const supabase = await createServiceRoleClient();
  const now = new Date();

  const periods = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    return d.toISOString().split("T")[0];
  }).reverse();

  const [totalUsersRes, tierBreakdownRes, recentSignupsRes] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("tier"),
    supabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at"),
  ]);

  // Build daily signup counts
  const signupsByDay: Record<string, number> = {};
  periods.forEach((d) => (signupsByDay[d] = 0));
  recentSignupsRes.data?.forEach((u) => {
    const day = u.created_at.split("T")[0];
    if (day in signupsByDay) signupsByDay[day]++;
  });

  const tierBreakdown: Record<string, number> = { free: 0, pro: 0, elite: 0 };
  tierBreakdownRes.data?.forEach((u) => {
    tierBreakdown[u.tier] = (tierBreakdown[u.tier] ?? 0) + 1;
  });

  const total = totalUsersRes.count ?? 0;
  const paid = (tierBreakdown.pro ?? 0) + (tierBreakdown.elite ?? 0);
  const conversionRate = total > 0 ? ((paid / total) * 100).toFixed(1) : "0.0";

  return { total, paid, conversionRate, tierBreakdown, signupsByDay, periods };
}

export default async function AnalyticsPage() {
  const { total, paid, conversionRate, tierBreakdown, signupsByDay, periods } = await getAnalytics();

  const maxSignups = Math.max(...Object.values(signupsByDay), 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-white/50" />
          Analytics
        </h1>
        <p className="text-sm text-white/50 mt-1">
          User growth, conversion, and platform usage.
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: total.toLocaleString(), icon: Users, color: "#7c3aed" },
          { label: "Paid Members", value: paid.toLocaleString(), icon: TrendingUp, color: "#10b981" },
          { label: "Conversion Rate", value: `${conversionRate}%`, icon: ArrowUpRight, color: "#f59e0b" },
          { label: "Free Users", value: tierBreakdown.free?.toLocaleString() ?? "0", icon: Users, color: "#6b7280" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#1a1a24] border border-white/10 rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider">{label}</p>
              <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${color}20` }}>
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Daily signups chart */}
      <div className="bg-[#1a1a24] border border-white/10 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Daily Signups — Last 7 Days</h2>
        <div className="flex items-end gap-2 h-32">
          {periods.map((day) => {
            const count = signupsByDay[day] ?? 0;
            const height = maxSignups > 0 ? (count / maxSignups) * 100 : 0;
            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <p className="text-[10px] text-white/60 font-medium">{count}</p>
                <div className="w-full rounded-t-sm bg-[var(--color-accent)]/60 transition-all" style={{ height: `${Math.max(height, 4)}%` }} />
                <p className="text-[9px] text-white/30 whitespace-nowrap">
                  {new Date(day + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tier breakdown */}
      <div className="bg-[#1a1a24] border border-white/10 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Tier Distribution</h2>
        <div className="space-y-3">
          {[
            { tier: "free", color: "#6b7280" },
            { tier: "pro", color: "#7c3aed" },
            { tier: "elite", color: "#f59e0b" },
          ].map(({ tier, color }) => {
            const count = tierBreakdown[tier] ?? 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={tier} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="capitalize font-medium" style={{ color }}>{tier}</span>
                  <span className="text-white/60">{count.toLocaleString()} ({pct.toFixed(1)}%)</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-white/30 text-center">
        Full analytics dashboard (retention, revenue, churn) coming with Stripe integration at launch.
      </p>
    </div>
  );
}
