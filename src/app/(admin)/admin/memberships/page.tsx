import { createServiceRoleClient } from "@/lib/supabase/server";
import { CreditCard, Users, Tag, Zap } from "lucide-react";

async function getMembershipData() {
  const supabase = await createServiceRoleClient();

  const [plansRes, couponsRes, statsRes] = await Promise.all([
    supabase.from("membership_plans").select("*").order("sort_order"),
    supabase.from("coupons").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(20),
    supabase.from("profiles").select("tier").then(({ data }) => {
      const counts: Record<string, number> = { free: 0, pro: 0, elite: 0 };
      data?.forEach((p) => { counts[p.tier] = (counts[p.tier] ?? 0) + 1; });
      return counts;
    }),
  ]);

  return {
    plans: plansRes.data ?? [],
    coupons: couponsRes.data ?? [],
    tierStats: statsRes,
  };
}

export default async function MembershipsPage() {
  const { plans, coupons, tierStats } = await getMembershipData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Memberships</h1>
        <p className="text-sm text-white/50 mt-1">
          Manage plans, pricing, and access. Stripe integration activates at launch.
        </p>
      </div>

      {/* Tier distribution */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(tierStats).map(([tier, count]) => {
          const colors: Record<string, string> = {
            free: "#6b7280",
            pro: "#7c3aed",
            elite: "#f59e0b",
          };
          return (
            <div key={tier} className="bg-[#1a1a24] border border-white/10 rounded-xl p-5 text-center">
              <div
                className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
                style={{ backgroundColor: `${colors[tier]}20` }}
              >
                {tier === "elite" ? (
                  <Zap className="w-5 h-5" style={{ color: colors[tier] }} />
                ) : (
                  <Users className="w-5 h-5" style={{ color: colors[tier] }} />
                )}
              </div>
              <p className="text-2xl font-bold text-white">{count}</p>
              <p className="text-xs capitalize font-medium mt-1" style={{ color: colors[tier] }}>
                {tier}
              </p>
            </div>
          );
        })}
      </div>

      {/* Plans */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-white/40" />
          Plans
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-[#1a1a24] border border-white/10 rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-white">{plan.name}</p>
                  <p className="text-xs text-white/50 mt-0.5">{plan.tagline}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${plan.is_active ? "bg-emerald-400/10 text-emerald-400" : "bg-white/5 text-white/30"}`}>
                  {plan.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <div>
                <p className="text-xl font-bold text-white">
                  {plan.price_monthly === 0 ? "Free" : `$${plan.price_monthly}/mo`}
                </p>
                {plan.price_annual > 0 && (
                  <p className="text-xs text-white/40">${plan.price_annual}/yr</p>
                )}
              </div>
              <div className="pt-3 border-t border-white/10">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Stripe</p>
                <p className="text-xs text-white/40 font-mono">
                  {plan.stripe_price_id_monthly ?? "Not configured"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coupons */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-white/40" />
            Active Coupons
          </h2>
        </div>

        {coupons.length === 0 ? (
          <div className="bg-[#1a1a24] border border-white/10 rounded-xl p-8 text-center">
            <Tag className="w-8 h-8 text-white/20 mx-auto mb-2" />
            <p className="text-sm text-white/40">No active coupons</p>
          </div>
        ) : (
          <div className="bg-[#1a1a24] border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase">Discount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase">Uses</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase">Expires</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} className="border-b border-white/5">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-white bg-white/5 px-2 py-0.5 rounded">{c.code}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-emerald-400">
                      {c.discount_type === "percent" ? `${c.discount_value}%` : `$${c.discount_value}`} off
                    </td>
                    <td className="px-4 py-3 text-sm text-white/60">
                      {c.used_count}{c.max_uses ? `/${c.max_uses}` : ""}
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40">
                      {c.valid_until ? new Date(c.valid_until).toLocaleDateString() : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
