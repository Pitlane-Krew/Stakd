"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";

interface PortfolioDataPoint {
  date: string;
  value: number;
}

interface Props {
  userId: string;
  totalValue: number;
}

export default function PortfolioChart({ userId, totalValue }: Props) {
  const [chartData, setChartData] = useState<PortfolioDataPoint[]>([]);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");
  const [loading, setLoading] = useState(true);
  const [change, setChange] = useState<{ amount: number; percent: number } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const supabase = createClient();

      const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365;
      const since = new Date(Date.now() - days * 86400000).toISOString();

      // Get all item IDs for this user
      const { data: items } = await supabase
        .from("items")
        .select("id, estimated_value")
        .eq("user_id", userId);

      if (!items?.length) {
        setLoading(false);
        return;
      }

      // Get price history
      const { data: history } = await supabase
        .from("price_history")
        .select("item_id, price, fetched_at")
        .in("item_id", items.map(i => i.id))
        .gte("fetched_at", since)
        .order("fetched_at", { ascending: true });

      if (!history?.length) {
        // No history — show flat line at current value
        const now = new Date().toISOString().split("T")[0];
        const start = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
        setChartData([
          { date: start, value: totalValue },
          { date: now, value: totalValue },
        ]);
        setChange({ amount: 0, percent: 0 });
        setLoading(false);
        return;
      }

      // Group by date, sum prices
      const dateMap = new Map<string, Map<string, number>>();

      for (const h of history) {
        const date = h.fetched_at.split("T")[0];
        if (!dateMap.has(date)) dateMap.set(date, new Map());
        dateMap.get(date)!.set(h.item_id, h.price);
      }

      // Build chart data with running totals
      const itemPrices = new Map<string, number>();
      // Initialize with current estimates
      items.forEach(i => itemPrices.set(i.id, i.estimated_value ?? 0));

      const points: PortfolioDataPoint[] = [];
      const sortedDates = [...dateMap.keys()].sort();

      for (const date of sortedDates) {
        const dayPrices = dateMap.get(date)!;
        dayPrices.forEach((price, itemId) => itemPrices.set(itemId, price));
        const total = [...itemPrices.values()].reduce((sum, p) => sum + p, 0);
        points.push({ date, value: Math.round(total * 100) / 100 });
      }

      // Add today
      points.push({
        date: new Date().toISOString().split("T")[0],
        value: totalValue,
      });

      setChartData(points);

      // Calculate change
      if (points.length >= 2) {
        const first = points[0].value;
        const last = totalValue;
        const amt = last - first;
        const pct = first > 0 ? (amt / first) * 100 : 0;
        setChange({ amount: Math.round(amt * 100) / 100, percent: Math.round(pct * 10) / 10 });
      }

      setLoading(false);
    };

    fetchData();
  }, [userId, totalValue, timeRange]);

  const isPositive = (change?.amount ?? 0) >= 0;

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wider">
            Portfolio Value
          </p>
          <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
          {change && (
            <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : change.amount === 0 ? <Minus className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {isPositive ? "+" : ""}{formatCurrency(Math.abs(change.amount))} ({isPositive ? "+" : ""}{change.percent}%)
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {(["7d", "30d", "90d", "1y"] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                timeRange === range
                  ? "bg-[var(--color-accent)] text-white"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]"
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Simple sparkline chart using CSS */}
      {!loading && chartData.length > 1 && (
        <div className="h-32 flex items-end gap-[2px]">
          {chartData.map((point, i) => {
            const max = Math.max(...chartData.map(p => p.value));
            const min = Math.min(...chartData.map(p => p.value));
            const range = max - min || 1;
            const height = ((point.value - min) / range) * 100;
            return (
              <div
                key={i}
                className="flex-1 rounded-t transition-all duration-300"
                style={{
                  height: `${Math.max(4, height)}%`,
                  backgroundColor: isPositive ? "var(--color-success)" : "var(--color-danger)",
                  opacity: 0.3 + (i / chartData.length) * 0.7,
                }}
                title={`${point.date}: ${formatCurrency(point.value)}`}
              />
            );
          })}
        </div>
      )}

      {loading && (
        <div className="h-32 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--color-text-muted)]" />
        </div>
      )}
    </Card>
  );
}
