"use client";

import { TrendingUp, Lock, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import { useTier } from "@/hooks/useTier";
import TrendingItems from "@/components/market/TrendingItems";
import UpgradeGate from "@/components/tier/UpgradeGate";
import Button from "@/components/ui/Button";

export default function MarketPage() {
  const { isPaid } = useTier();

  return (
    <div className="lg:max-w-3xl lg:mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-[var(--color-accent)]" />
          Market Momentum
        </h1>
        <p className="text-[var(--color-text-muted)] mt-1">
          Track trending items, price movements, and market opportunities
        </p>
      </div>

      {/* Trending Items - Always Available */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold">Trending Items</h2>
        <TrendingItems />
      </section>

      {/* Pro Features Section */}
      {!isPaid && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Advanced Market Analytics</h2>
            <span className="px-2 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[10px] font-bold">
              PRO
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-5 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="text-orange-400">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <Lock className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <p className="font-semibold">Price Momentum Analysis</p>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  7-day, 30-day, and 90-day price trends with momentum indicators
                </p>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/5 pointer-events-none" />
            </Card>

            <Card className="p-5 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="text-emerald-400">
                  <Sparkles className="w-6 h-6" />
                </div>
                <Lock className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <p className="font-semibold">Category Performance</p>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  Compare gains across categories and identify best performers
                </p>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/5 pointer-events-none" />
            </Card>
          </div>

          <Link href="/pricing">
            <Button className="w-full">
              <Sparkles className="w-4 h-4" />
              Upgrade to Pro
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </section>
      )}

      {isPaid && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold">Advanced Market Analytics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-5 space-y-3">
              <div className="text-orange-400">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Price Momentum Analysis</p>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  7-day, 30-day, and 90-day price trends with momentum indicators
                </p>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">Coming soon</p>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="text-emerald-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Category Performance</p>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  Compare gains across categories and identify best performers
                </p>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">Coming soon</p>
            </Card>
          </div>
        </section>
      )}

      {/* Footer Links */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Related Pages</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href="/tools">
            <div className="p-4 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent)] transition-colors">
              <p className="font-semibold text-sm">Tools</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Calculators & trackers
              </p>
            </div>
          </Link>
          <Link href="/watchlist">
            <div className="p-4 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent)] transition-colors">
              <p className="font-semibold text-sm">Watchlist</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Items you want
              </p>
            </div>
          </Link>
          <Link href="/collection">
            <div className="p-4 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent)] transition-colors">
              <p className="font-semibold text-sm">Collections</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Your portfolio
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
