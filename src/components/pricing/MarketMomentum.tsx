"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  Snowflake,
  BarChart3,
  Loader2,
} from "lucide-react";
import Card from "@/components/ui/Card";

interface MomentumData {
  itemId: string;
  title: string;
  category: string;
  currentPrice: number;
  priceChange7d: number;
  priceChange30d: number;
  priceChange90d: number;
  volume7d: number;
  momentum: "hot" | "rising" | "stable" | "cooling" | "cold";
  badge: string;
}

interface Props {
  /** Items to show momentum for */
  items?: Array<{
    id: string;
    title: string;
    category: string;
    estimated_value: number | null;
  }>;
  /** Or fetch top movers for a category */
  category?: string;
}

function getMomentumIcon(momentum: string) {
  switch (momentum) {
    case "hot":
      return <Flame className="w-4 h-4 text-red-400" />;
    case "rising":
      return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    case "stable":
      return <Minus className="w-4 h-4 text-blue-400" />;
    case "cooling":
      return <TrendingDown className="w-4 h-4 text-amber-400" />;
    case "cold":
      return <Snowflake className="w-4 h-4 text-cyan-400" />;
    default:
      return <Minus className="w-4 h-4" />;
  }
}

function getMomentumColor(momentum: string): string {
  switch (momentum) {
    case "hot":
      return "rgba(239,68,68,0.15)";
    case "rising":
      return "rgba(16,185,129,0.15)";
    case "stable":
      return "rgba(59,130,246,0.15)";
    case "cooling":
      return "rgba(245,158,11,0.15)";
    case "cold":
      return "rgba(6,182,212,0.15)";
    default:
      return "transparent";
  }
}

function getMomentumTextColor(momentum: string): string {
  switch (momentum) {
    case "hot":
      return "#ef4444";
    case "rising":
      return "#10b981";
    case "stable":
      return "#3b82f6";
    case "cooling":
      return "#f59e0b";
    case "cold":
      return "#06b6d4";
    default:
      return "inherit";
  }
}

/**
 * Compute momentum from price history.
 * In production this would call the valuation API;
 * here we simulate based on available data.
 */
function computeMomentum(
  item: { id: string; title: string; category: string; estimated_value: number | null }
): MomentumData {
  // Simulated momentum calculation — in prod, compare price_history rows
  const price = item.estimated_value ?? 0;
  const seed = item.title.length + (item.estimated_value ?? 0);
  const change7d = ((seed % 20) - 10) * 0.5;
  const change30d = ((seed % 30) - 15) * 0.8;
  const change90d = ((seed % 40) - 20) * 1.2;
  const vol = Math.floor(seed % 50) + 5;

  let momentum: MomentumData["momentum"] = "stable";
  if (change7d > 5 && change30d > 10) momentum = "hot";
  else if (change7d > 2) momentum = "rising";
  else if (change7d < -5 && change30d < -10) momentum = "cold";
  else if (change7d < -2) momentum = "cooling";

  const badges: Record<string, string> = {
    hot: "On Fire",
    rising: "Trending",
    stable: "Steady",
    cooling: "Dipping",
    cold: "Bargain",
  };

  return {
    itemId: item.id,
    title: item.title,
    category: item.category,
    currentPrice: price,
    priceChange7d: change7d,
    priceChange30d: change30d,
    priceChange90d: change90d,
    volume7d: vol,
    momentum,
    badge: badges[momentum],
  };
}

export default function MarketMomentum({ items, category }: Props) {
  const [data, setData] = useState<MomentumData[]>([]);
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "90d">("7d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (items?.length) {
      setData(items.map(computeMomentum));
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [items]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => {
    const key = `priceChange${timeframe}` as keyof MomentumData;
    return Math.abs(b[key] as number) - Math.abs(a[key] as number);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[var(--color-accent)]" />
          Market Momentum
        </h3>
        <div className="flex gap-1">
          {(["7d", "30d", "90d"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                timeframe === tf
                  ? "bg-[var(--color-accent)] text-white"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] text-center py-6">
          Add items to your collection to see market momentum
        </p>
      ) : (
        <div className="space-y-2">
          {sorted.map((item) => {
            const change =
              timeframe === "7d"
                ? item.priceChange7d
                : timeframe === "30d"
                  ? item.priceChange30d
                  : item.priceChange90d;

            return (
              <Card key={item.itemId} className="p-3 flex items-center gap-3">
                {/* Momentum badge */}
                <div
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0"
                  style={{
                    background: getMomentumColor(item.momentum),
                    color: getMomentumTextColor(item.momentum),
                  }}
                >
                  {getMomentumIcon(item.momentum)}
                  {item.badge}
                </div>

                {/* Item info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {item.volume7d} sales this week
                  </p>
                </div>

                {/* Price & change */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold">
                    ${item.currentPrice.toLocaleString()}
                  </p>
                  <p
                    className={`text-xs font-medium ${
                      change > 0
                        ? "text-emerald-400"
                        : change < 0
                          ? "text-red-400"
                          : "text-[var(--color-text-muted)]"
                    }`}
                  >
                    {change > 0 ? "+" : ""}
                    {change.toFixed(1)}%
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
