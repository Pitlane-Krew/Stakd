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
import { createClient } from "@/lib/supabase/client";

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

function classifyMomentum(change7d: number, change30d: number): { momentum: MomentumData["momentum"]; badge: string } {
  const badges: Record<string, string> = {
    hot: "On Fire",
    rising: "Trending",
    stable: "Steady",
    cooling: "Dipping",
    cold: "Bargain",
  };

  let momentum: MomentumData["momentum"] = "stable";
  if (change7d > 5 && change30d > 10) momentum = "hot";
  else if (change7d > 2) momentum = "rising";
  else if (change7d < -5 && change30d < -10) momentum = "cold";
  else if (change7d < -2) momentum = "cooling";

  return { momentum, badge: badges[momentum] };
}

export default function MarketMomentum({ items, category }: Props) {
  const [data, setData] = useState<MomentumData[]>([]);
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "90d">("7d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!items?.length) {
      setLoading(false);
      return;
    }

    const fetchMomentum = async () => {
      const supabase = createClient();
      const now = new Date();
      const days7 = new Date(now.getTime() - 7 * 86400000).toISOString();
      const days30 = new Date(now.getTime() - 30 * 86400000).toISOString();
      const days90 = new Date(now.getTime() - 90 * 86400000).toISOString();

      const results: MomentumData[] = [];

      for (const item of items) {
        const currentPrice = item.estimated_value ?? 0;
        if (currentPrice <= 0) continue;

        // Fetch price history for this item
        const { data: history } = await supabase
          .from("price_history")
          .select("price, fetched_at")
          .eq("item_id", item.id)
          .gte("fetched_at", days90)
          .order("fetched_at", { ascending: true });

        if (!history || history.length === 0) {
          // No history — use current price with 0% change (stable)
          results.push({
            itemId: item.id,
            title: item.title,
            category: item.category,
            currentPrice,
            priceChange7d: 0,
            priceChange30d: 0,
            priceChange90d: 0,
            volume7d: 0,
            ...classifyMomentum(0, 0),
          });
          continue;
        }

        // Calculate price changes
        const price7d = history.find(h => h.fetched_at >= days7)?.price ?? currentPrice;
        const price30d = history.find(h => h.fetched_at >= days30)?.price ?? currentPrice;
        const price90d = history[0]?.price ?? currentPrice;

        const change7d = price7d > 0 ? ((currentPrice - price7d) / price7d) * 100 : 0;
        const change30d = price30d > 0 ? ((currentPrice - price30d) / price30d) * 100 : 0;
        const change90d = price90d > 0 ? ((currentPrice - price90d) / price90d) * 100 : 0;

        // Count entries in last 7 days as "volume"
        const volume7d = history.filter(h => h.fetched_at >= days7).length;

        results.push({
          itemId: item.id,
          title: item.title,
          category: item.category,
          currentPrice,
          priceChange7d: Math.round(change7d * 10) / 10,
          priceChange30d: Math.round(change30d * 10) / 10,
          priceChange90d: Math.round(change90d * 10) / 10,
          volume7d,
          ...classifyMomentum(change7d, change30d),
        });
      }

      // Sort by absolute change
      results.sort((a, b) => Math.abs(b.priceChange7d) - Math.abs(a.priceChange7d));
      setData(results);
      setLoading(false);
    };

    fetchMomentum();
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
