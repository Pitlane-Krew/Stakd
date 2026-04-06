"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { PriceHistory } from "@/types/database";
import { formatCurrency } from "@/lib/utils";

type Range = "7D" | "30D" | "90D" | "1Y" | "ALL";

interface Props {
  priceHistory: PriceHistory[];
}

const RANGE_DAYS: Record<Range, number | null> = {
  "7D": 7,
  "30D": 30,
  "90D": 90,
  "1Y": 365,
  ALL: null,
};

const SOURCE_COLORS: Record<string, string> = {
  ebay: "var(--color-success)",
  psa: "var(--color-accent)",
  goldin: "#F59E0B",
};

export default function PriceChart({ priceHistory }: Props) {
  const [range, setRange] = useState<Range>("30D");

  const cutoff = RANGE_DAYS[range];
  const now = Date.now();
  const filtered = cutoff
    ? priceHistory.filter(
        (p) => now - new Date(p.fetched_at).getTime() < cutoff * 86400000
      )
    : priceHistory;

  // Group by date for chart data
  const chartData = filtered
    .sort(
      (a, b) =>
        new Date(a.fetched_at).getTime() - new Date(b.fetched_at).getTime()
    )
    .map((p) => ({
      date: new Date(p.fetched_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      price: p.price,
      source: p.source,
    }));

  // Get unique sources
  const sources = [...new Set(filtered.map((p) => p.source))];

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl bg-[var(--color-bg-surface)] p-6">
        <h3 className="text-sm font-semibold mb-4">Price History</h3>
        <div className="h-48 flex items-center justify-center text-[var(--color-text-muted)] text-sm">
          No price data available yet
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[var(--color-bg-surface)] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Price History</h3>
        <div className="flex gap-1">
          {(Object.keys(RANGE_DAYS) as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                range === r
                  ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)]"
                  : "bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            opacity={0.3}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number) => [formatCurrency(value), "Price"]}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="var(--color-accent)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex gap-4 mt-3">
        {sources.map((source) => (
          <span
            key={source}
            className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background:
                  SOURCE_COLORS[source.toLowerCase()] ?? "var(--color-accent)",
              }}
            />
            {source}
          </span>
        ))}
      </div>
    </div>
  );
}
