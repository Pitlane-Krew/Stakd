"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Layers, TrendingUp, Package, DollarSign, ArrowRight, Scan, ArrowLeftRight, Sparkles, Users, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import { getCollectionAnalytics } from "@/services/collections";
import Card from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import { CATEGORIES } from "@/config/constants";

interface Analytics {
  collectionCount: number;
  totalItems: number;
  totalValue: number;
  categoryBreakdown: Record<string, number>;
  collections: { id: string; name: string; category: string; item_count: number; total_value: number }[];
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { tierDef, isPaid } = useTier();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getCollectionAnalytics(user.id)
      .then(setAnalytics)
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-[var(--color-bg-elevated)] rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-[var(--color-bg-elevated)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Collections", value: analytics?.collectionCount ?? 0, icon: Layers, color: "var(--color-accent)" },
    { label: "Total Items", value: analytics?.totalItems ?? 0, icon: Package, color: "var(--color-warning)" },
    { label: "Total Value", value: formatCurrency(analytics?.totalValue ?? 0), icon: DollarSign, color: "var(--color-success)" },
    { label: "Categories", value: Object.keys(analytics?.categoryBreakdown ?? {}).length, icon: TrendingUp, color: "var(--color-accent)" },
  ];

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back{profile?.display_name ? `, ${profile.display_name}` : ""}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Here&apos;s your collection overview
          </p>
        </div>
        <Link
          href="/pricing"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
          style={{
            backgroundColor: `${tierDef.color}15`,
            color: tierDef.color,
          }}
        >
          {isPaid ? <Sparkles className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
          {tierDef.name}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
                <p className="text-lg font-bold">{value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/scan">
          <Card hover className="p-4 flex flex-col items-center gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-[var(--color-accent)]/10">
              <Scan className="w-5 h-5 text-[var(--color-accent)]" />
            </div>
            <p className="text-xs font-medium">Scan Item</p>
          </Card>
        </Link>
        <Link href="/trades">
          <Card hover className="p-4 flex flex-col items-center gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-emerald-500/10">
              <ArrowLeftRight className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-xs font-medium">Trade Center</p>
          </Card>
        </Link>
        <Link href="/feed">
          <Card hover className="p-4 flex flex-col items-center gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-blue-500/10">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-xs font-medium">Community</p>
          </Card>
        </Link>
        <Link href="/restock">
          <Card hover className="p-4 flex flex-col items-center gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-amber-500/10">
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-xs font-medium">Restocks</p>
          </Card>
        </Link>
      </div>

      {/* Top Collections */}
      {analytics && analytics.collections.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Your Collections</h2>
            <Link href="/collection" className="text-sm text-[var(--color-accent)] hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {analytics.collections.slice(0, 5).map((c) => {
              const cat = CATEGORIES.find((cat) => cat.value === c.category);
              return (
                <Link key={c.id} href={`/collection/${c.id}`}>
                  <Card hover className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {cat?.label} · {c.item_count} items
                      </p>
                    </div>
                    {Number(c.total_value) > 0 && (
                      <span className="text-sm font-medium text-[var(--color-success)]">
                        {formatCurrency(Number(c.total_value))}
                      </span>
                    )}
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Upgrade CTA for free users */}
      {!isPaid && (
        <Link href="/pricing">
          <Card hover className="p-5 bg-gradient-to-r from-[var(--color-accent)]/10 via-purple-500/5 to-pink-500/10 border-[var(--color-accent)]/20">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-[var(--color-accent)]/15">
                <Sparkles className="w-6 h-6 text-[var(--color-accent)]" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Unlock Pro Features</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Insurance reports, market momentum, unlimited alerts, and more — starting at $7.99/mo
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-[var(--color-accent)]" />
            </div>
          </Card>
        </Link>
      )}

      {/* Category breakdown */}
      {analytics && Object.keys(analytics.categoryBreakdown).length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-4">Category Breakdown</h3>
          <div className="space-y-3">
            {Object.entries(analytics.categoryBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([category, count]) => {
                const cat = CATEGORIES.find((c) => c.value === category);
                const pct = analytics.totalItems > 0 ? (count / analytics.totalItems) * 100 : 0;
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{cat?.label || category}</span>
                      <span className="text-[var(--color-text-muted)]">{count} items</span>
                    </div>
                    <div className="h-1.5 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-accent)] rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      )}
    </div>
  );
}
