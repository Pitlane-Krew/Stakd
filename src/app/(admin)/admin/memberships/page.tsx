"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  Users,
  Tag,
  Zap,
  Plus,
  Copy,
  Check,
  Crown,
  Sparkles,
  RefreshCw,
  Loader2,
} from "lucide-react";

interface PromoCode {
  id: string;
  code: string;
  tier: string;
  duration_days: number | null;
  max_uses: number | null;
  used_count: number;
  reason: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

interface TierStats {
  free: number;
  pro: number;
  elite: number;
}

export default function MembershipsPage() {
  const [tierStats, setTierStats] = useState<TierStats>({ free: 0, pro: 0, elite: 0 });
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // New code form
  const [showCreate, setShowCreate] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newTier, setNewTier] = useState<"pro" | "elite">("pro");
  const [newDuration, setNewDuration] = useState<string>("30");
  const [newMaxUses, setNewMaxUses] = useState<string>("1");
  const [newReason, setNewReason] = useState("Influencer / reviewer access");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/promo-codes");
      if (res.ok) {
        const data = await res.json();
        setPromoCodes(data.codes ?? []);
      }
    } catch (err) {
      console.error("Failed to load promo codes:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!newCode.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: newCode.trim(),
          tier: newTier,
          duration_days: newDuration === "0" ? null : parseInt(newDuration),
          max_uses: newMaxUses === "0" ? null : parseInt(newMaxUses),
          reason: newReason,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewCode("");
        setNewDuration("30");
        setNewMaxUses("1");
        setNewReason("Influencer / reviewer access");
        load();
      } else {
        const data = await res.json();
        setCreateError(data.error ?? "Failed to create code");
      }
    } catch {
      setCreateError("Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  function generateRandomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "STAKD-";
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    setNewCode(code);
  }

  const tierColors: Record<string, string> = {
    free: "#6b7280",
    pro: "#7c3aed",
    elite: "#f59e0b",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Memberships</h1>
        <p className="text-sm text-white/50 mt-1">
          Manage tiers, promo codes, and influencer access. Stripe activates at paid launch.
        </p>
      </div>

      {/* Tier distribution */}
      <div className="grid grid-cols-3 gap-4">
        {(["free", "pro", "elite"] as const).map((tier) => (
          <div key={tier} className="bg-[#1a1a24] border border-white/10 rounded-xl p-5 text-center">
            <div
              className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
              style={{ backgroundColor: `${tierColors[tier]}20` }}
            >
              {tier === "elite" ? (
                <Crown className="w-5 h-5" style={{ color: tierColors[tier] }} />
              ) : tier === "pro" ? (
                <Sparkles className="w-5 h-5" style={{ color: tierColors[tier] }} />
              ) : (
                <Users className="w-5 h-5" style={{ color: tierColors[tier] }} />
              )}
            </div>
            <p className="text-2xl font-bold text-white">{tierStats[tier]}</p>
            <p className="text-xs capitalize font-medium mt-1" style={{ color: tierColors[tier] }}>
              {tier}
            </p>
          </div>
        ))}
      </div>

      {/* Promo Codes Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-white/40" />
            Promo Codes
          </h2>
          <div className="flex gap-2">
            <button
              onClick={load}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors text-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
              New Code
            </button>
          </div>
        </div>

        {/* Create Form */}
        {showCreate && (
          <div className="bg-[#1a1a24] border border-white/10 rounded-xl p-5 mb-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Code</label>
                <div className="flex gap-2">
                  <input
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="STAKD-ELITE"
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white font-mono uppercase placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                  />
                  <button
                    onClick={generateRandomCode}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/10"
                    title="Generate random code"
                  >
                    Auto
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Tier</label>
                <select
                  value={newTier}
                  onChange={(e) => setNewTier(e.target.value as "pro" | "elite")}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white"
                >
                  <option value="pro">Pro</option>
                  <option value="elite">Elite</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Duration (days, 0 = forever)</label>
                <input
                  type="number"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Max uses (0 = unlimited)</label>
                <input
                  type="number"
                  value={newMaxUses}
                  onChange={(e) => setNewMaxUses(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Reason / Note</label>
              <input
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
            </div>
            {createError && (
              <p className="text-sm text-red-400">{typeof createError === "string" ? createError : "Invalid input"}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newCode.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Create Code
              </button>
            </div>
          </div>
        )}

        {/* Codes Table */}
        {loading ? (
          <div className="bg-[#1a1a24] border border-white/10 rounded-xl p-8 text-center">
            <Loader2 className="w-6 h-6 text-white/30 mx-auto animate-spin" />
          </div>
        ) : promoCodes.length === 0 ? (
          <div className="bg-[#1a1a24] border border-white/10 rounded-xl p-8 text-center">
            <Tag className="w-8 h-8 text-white/20 mx-auto mb-2" />
            <p className="text-sm text-white/40">No promo codes yet</p>
            <p className="text-xs text-white/25 mt-1">Create one to share with influencers and reviewers</p>
          </div>
        ) : (
          <div className="bg-[#1a1a24] border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase">Tier</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase">Duration</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase">Uses</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase">Reason</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-white/40 uppercase">Copy</th>
                </tr>
              </thead>
              <tbody>
                {promoCodes.map((pc) => (
                  <tr key={pc.id} className="border-b border-white/5">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-white bg-white/5 px-2 py-0.5 rounded">
                        {pc.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {pc.tier === "elite" ? (
                          <Crown className="w-3 h-3 text-amber-400" />
                        ) : (
                          <Sparkles className="w-3 h-3 text-purple-400" />
                        )}
                        <span className="text-xs capitalize text-white/70">{pc.tier}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-white/60">
                      {pc.duration_days ? `${pc.duration_days}d` : "Forever"}
                    </td>
                    <td className="px-4 py-3 text-sm text-white/60">
                      {pc.used_count}{pc.max_uses ? `/${pc.max_uses}` : "/∞"}
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40 max-w-[200px] truncate">
                      {pc.reason}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => copyCode(pc.code)}
                        className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        {copiedCode === pc.code ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-[#1a1a24] border border-white/10 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-white/40" />
          Tier Feature Matrix
        </h3>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <p className="text-white/60 font-semibold mb-1">Starter (Free)</p>
            <p className="text-white/40">3 collections, 50 items each</p>
            <p className="text-white/40">No AI grades, no price alerts</p>
            <p className="text-white/40">Community, social, set tracker</p>
          </div>
          <div>
            <p className="text-purple-400 font-semibold mb-1">Pro ($5.99/mo)</p>
            <p className="text-white/40">25 collections, 500 items each</p>
            <p className="text-white/40">50 AI grades/mo, 25 price alerts</p>
            <p className="text-white/40">Analytics, insurance, all tools</p>
          </div>
          <div>
            <p className="text-amber-400 font-semibold mb-1">STAKD VIP ($9.99/mo)</p>
            <p className="text-white/40">Unlimited everything</p>
            <p className="text-white/40">Unlimited AI grades & alerts</p>
            <p className="text-white/40">Priority support, early access</p>
          </div>
        </div>
      </div>
    </div>
  );
}
