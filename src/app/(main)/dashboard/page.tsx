"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  TrendingUp,
  Package,
  DollarSign,
  ArrowRight,
  Scan,
  ArrowLeftRight,
  Sparkles,
  Users,
  Shield,
  ChevronRight,
  Flame,
  Star,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import { getCollectionAnalytics } from "@/services/collections";
import Card from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import { CATEGORIES } from "@/config/constants";
import { getCategory } from "@/config/category-registry";

interface Analytics {
  collectionCount: number;
  totalItems: number;
  totalValue: number;
  categoryBreakdown: Record<string, number>;
  collections: {
    id: string;
    name: string;
    category: string;
    item_count: number;
    total_value: number;
  }[];
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
        {/* Skeleton: Greeting */}
        <div className="space-y-2">
          <div className="h-7 w-48 skeleton rounded-lg" />
          <div className="h-4 w-32 skeleton rounded-lg" />
        </div>
        {/* Skeleton: Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[88px] rounded-2xl skeleton" />
          ))}
        </div>
        {/* Skeleton: Quick actions */}
        <div className="grid grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl skeleton" />
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: "Collections",
      value: analytics?.collectionCount ?? 0,
      icon: Layers,
      color: "#4B9CD3",
      bg: "rgba(75, 156, 211, 0.12)",
    },
    {
      label: "Total Items",
      value: analytics?.totalItems ?? 0,
      icon: Package,
      color: "#f59e0b",
      bg: "rgba(245, 158, 11, 0.12)",
    },
    {
      label: "Portfolio Value",
      value: formatCurrency(analytics?.totalValue ?? 0),
      icon: DollarSign,
      color: "#00E071",
      bg: "rgba(0, 224, 113, 0.12)",
    },
    {
      label: "Categories",
      value: Object.keys(analytics?.categoryBreakdown ?? {}).length,
      icon: TrendingUp,
      color: "#4B9CD3",
      bg: "rgba(75, 156, 211, 0.12)",
    },
  ];

  const quickActions = [
    { href: "/scan", label: "Scan", icon: Scan, color: "#00E071", bg: "rgba(0, 224, 113, 0.12)" },
    { href: "/trades", label: "Trade", icon: ArrowLeftRight, color: "#4B9CD3", bg: "rgba(75, 156, 211, 0.12)" },
    { href: "/feed", label: "Feed", icon: Users, color: "#4B9CD3", bg: "rgba(75, 156, 211, 0.12)" },
    { href: "/restock", label: "Restocks", icon: Flame, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)" },
  ];

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-6 lg:max-w-4xl">
      {/* ── Hero Greeting ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-[var(--color-text-muted)]">
            {greeting()}
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {profile?.display_name || "Collector"}
          </h1>
        </div>
        <Link
          href="/pricing"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 transition-all active:scale-95"
          style={{
            backgroundColor: `${tierDef.color}15`,
            color: tierDef.color,
          }}
        >
          {isPaid ? (
            <Star className="w-3 h-3" />
          ) : (
            <Shield className="w-3 h-3" />
          )}
          {tierDef.name}
        </Link>
      </div>

      {/* ── Portfolio Stats ── */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="relative overflow-hidden rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-4 card-interactive"
          >
            <div className="flex items-start gap-3">
              <div
                className="p-2 rounded-xl shrink-0"
                style={{ backgroundColor: bg }}
              >
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-[var(--color-text-muted)] font-medium uppercase tracking-wider">
                  {label}
                </p>
                <p className="text-xl font-bold mt-0.5 truncate">{value}</p>
              </div>
            </div>
            {/* Subtle accent glow */}
            <div
              className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-[0.04] blur-2xl"
              style={{ backgroundColor: color }}
            />
          </div>
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {quickActions.map(({ href, label, icon: Icon, color, bg }) => (
          <Link key={href} href={href}>
            <div className="flex flex-col items-center gap-2 py-3 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] card-interactive">
              <div
                className="p-2.5 rounded-xl"
                style={{ backgroundColor: bg }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <span className="text-[11px] font-semibold text-[var(--color-text-secondary)]">
                {label}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Top Collections ── */}
      {analytics && analytics.collections.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold">Your Collections</h2>
            <Link
              href="/collection"
              className="flex items-center gap-0.5 text-xs text-[var(--color-accent)] font-semibold active:opacity-70"
            >
              View all
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-2">
            {analytics.collections.slice(0, 5).map((c) => {
              const cat = CATEGORIES.find((cat) => cat.value === c.category);
              return (
                <Link key={c.id} href={`/collection/${c.id}`}>
                  <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] card-interactive">
                    {/* Category color indicator */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-sm"
                      style={{
                        backgroundColor:
                          (cat?.value && getCategory(cat.value)?.color) || "var(--color-accent)",
                      }}
                    >
                      {c.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{c.name}</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        {cat?.label} &middot; {c.item_count} items
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {Number(c.total_value) > 0 && (
                        <p className="text-sm font-bold text-[var(--color-success)]">
                          {formatCurrency(Number(c.total_value))}
                        </p>
                      )}
                      <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] ml-auto mt-0.5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Empty State (no collections) ── */}
      {analytics && analytics.collections.length === 0 && (
        <div className="text-center py-12 px-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--color-accent-subtle)] flex items-center justify-center mb-4">
            <Layers className="w-8 h-8 text-[var(--color-accent)]" />
          </div>
          <h3 className="text-lg font-bold mb-2">Start Your Collection</h3>
          <p className="text-sm text-[var(--color-text-muted)] mb-6 max-w-xs mx-auto">
            Build your digital portfolio. Track values, discover trends, and connect with collectors.
          </p>
          <Link
            href="/collection"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--color-accent)] text-white font-semibold text-sm active:scale-95 transition-transform"
          >
            <Layers className="w-4 h-4" />
            Create Collection
          </Link>
        </div>
      )}

      {/* ── Upgrade CTA for free users ── */}
      {!isPaid && (
        <Link href="/pricing">
          <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-[var(--color-accent)]/15 via-[var(--color-accent)]/5 to-[var(--color-success)]/10 border border-[var(--color-accent)]/20 card-interactive">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-[var(--color-accent)]/20 shrink-0">
                <Sparkles className="w-6 h-6 text-[var(--color-accent)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">Unlock Pro Features</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">
                  Insurance reports, market momentum, unlimited alerts &mdash; starting at $7.99/mo
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-[var(--color-accent)] shrink-0" />
            </div>
            {/* Decorative glow */}
            <div className="absolute -bottom-12 -right-12 w-40 h-40 rounded-full bg-[var(--color-accent)] opacity-[0.06] blur-3xl" />
          </div>
        </Link>
      )}

      {/* ── Category Breakdown ── */}
      {analytics && Object.keys(analytics.categoryBreakdown).length > 0 && (
        <section className="pb-4">
          <h3 className="text-base font-bold mb-4">Category Breakdown</h3>
          <div className="rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-4 space-y-4">
            {Object.entries(analytics.categoryBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([category, count]) => {
                const cat = CATEGORIES.find((c) => c.value === category);
                const pct =
                  analytics.totalItems > 0
                    ? (count / analytics.totalItems) * 100
                    : 0;
                const catColor = getCategory(category)?.color || "var(--color-accent)";
                return (
                  <div key={category} className="space-y-1.5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">
                        {cat?.label || category}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
                        {count} items &middot; {Math.round(pct)}%
                      </span>
                    </div>
                    <div className="h-2 bg-[var(--color-bg-elevated)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: catColor,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}
    </div>
  );
}
