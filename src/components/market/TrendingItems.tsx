"use client";

import { useState, useEffect } from "react";
import { Flame, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import Card from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { getCategory } from "@/config/category-registry";
import Link from "next/link";

interface TrendingItem {
  id: string;
  title: string;
  category: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  imageUrl?: string;
}

export default function TrendingItems() {
  const [items, setItems] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"gainers" | "losers">("gainers");

  useEffect(() => {
    const fetchTrending = async () => {
      const supabase = createClient();
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      // Get items with price history
      const { data: recentPrices } = await supabase
        .from("price_history")
        .select("item_id, price, fetched_at")
        .gte("fetched_at", sevenDaysAgo)
        .order("fetched_at", { ascending: true })
        .limit(500);

      if (!recentPrices?.length) {
        setLoading(false);
        return;
      }

      // Group by item, get earliest and latest price
      const itemPrices = new Map<string, { earliest: number; latest: number }>();
      for (const p of recentPrices) {
        const existing = itemPrices.get(p.item_id);
        if (!existing) {
          itemPrices.set(p.item_id, { earliest: p.price, latest: p.price });
        } else {
          existing.latest = p.price; // Since sorted ascending, last one is latest
        }
      }

      // Get item details
      const itemIds = [...itemPrices.keys()].slice(0, 50);
      const { data: itemDetails } = await supabase
        .from("items")
        .select("id, title, category, estimated_value, image_urls")
        .in("id", itemIds);

      if (!itemDetails?.length) {
        setLoading(false);
        return;
      }

      const trending: TrendingItem[] = itemDetails
        .map(item => {
          const prices = itemPrices.get(item.id);
          if (!prices || prices.earliest === 0) return null;
          const changePercent = ((prices.latest - prices.earliest) / prices.earliest) * 100;
          return {
            id: item.id,
            title: item.title,
            category: item.category,
            currentValue: item.estimated_value ?? prices.latest,
            previousValue: prices.earliest,
            changePercent: Math.round(changePercent * 10) / 10,
            imageUrl: item.image_urls?.[0],
          };
        })
        .filter(Boolean) as TrendingItem[];

      setItems(trending.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent)));
      setLoading(false);
    };

    fetchTrending();
  }, []);

  const filtered = items
    .filter(i => tab === "gainers" ? i.changePercent > 0 : i.changePercent < 0)
    .slice(0, 8);

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-400" />
          Trending This Week
        </h3>
        <div className="flex gap-1 p-1 rounded-lg bg-[var(--color-bg-elevated)]">
          <button
            onClick={() => setTab("gainers")}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              tab === "gainers" ? "bg-emerald-400 text-[#09090b]" : "text-[var(--color-text-muted)]"
            }`}
          >
            Gainers
          </button>
          <button
            onClick={() => setTab("losers")}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              tab === "losers" ? "bg-red-400 text-white" : "text-[var(--color-text-muted)]"
            }`}
          >
            Losers
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--color-text-muted)]" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] text-center py-6">
          No trending data yet. Price history builds over time.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const catDef = getCategory(item.category);
            const isUp = item.changePercent > 0;
            return (
              <Link key={item.id} href={`/item/${item.id}`}>
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--color-bg-hover)] transition-colors">
                  {/* Category color dot */}
                  <div
                    className="w-2 h-8 rounded-full shrink-0"
                    style={{ backgroundColor: catDef?.color || "var(--color-accent)" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{catDef?.label || item.category}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{formatCurrency(item.currentValue)}</p>
                    <p className={`text-xs font-medium flex items-center gap-0.5 justify-end ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {isUp ? "+" : ""}{item.changePercent}%
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}
