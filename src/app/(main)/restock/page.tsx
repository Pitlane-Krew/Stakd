"use client";

import { useEffect, useState } from "react";
import { MapPin, Plus, List, Map as MapIcon, CheckCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import MapView from "@/components/map/MapView";
import Link from "next/link";
import { getRestocks, verifyRestock } from "@/services/restocks";
import { formatRelativeTime, getFreshnessColor } from "@/lib/utils";
import { getCategories } from "@/config/category-registry";
import type { Restock } from "@/types/database";

export default function RestockPage() {
  const [view, setView] = useState<"map" | "list">("list");
  const [restocks, setRestocks] = useState<Restock[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const categories = getCategories();

  useEffect(() => {
    async function load() {
      try {
        const data = await getRestocks();
        setRestocks(data);
      } catch (err) {
        console.error("Failed to load restocks:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered =
    filter === "all"
      ? restocks
      : restocks.filter((r) => r.category === filter);

  async function handleVerify(id: string) {
    try {
      await verifyRestock(id);
      setRestocks((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, verified_count: r.verified_count + 1 } : r
        )
      );
    } catch (err) {
      console.error("Failed to verify:", err);
    }
  }

  function getFreshnessScore(restock: Restock): number {
    return restock.freshness_score ?? 0;
  }

  function getFreshnessBarColor(score: number): string {
    if (score >= 70) return "bg-emerald-400";
    if (score >= 40) return "bg-amber-400";
    return "bg-red-400";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="w-6 h-6 text-[var(--color-warning)]" />
            Restock Tracker
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {filtered.length} restocks nearby
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)]">
            <button
              onClick={() => setView("list")}
              className={`p-1.5 rounded-md transition-colors ${
                view === "list"
                  ? "bg-[var(--color-accent)] text-white"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("map")}
              className={`p-1.5 rounded-md transition-colors ${
                view === "map"
                  ? "bg-[var(--color-accent)] text-white"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              <MapIcon className="w-4 h-4" />
            </button>
          </div>
          <Link href="/restock/new">
            <Button size="sm">
              <Plus className="w-4 h-4" /> Report
            </Button>
          </Link>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            filter === "all"
              ? "bg-[var(--color-accent)] text-white"
              : "bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === cat.id
                ? "text-white"
                : "bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]"
            }`}
            style={
              filter === cat.id ? { backgroundColor: cat.color } : undefined
            }
          >
            {cat.label}
          </button>
        ))}
      </div>

      {view === "map" ? (
        <MapView
          className="h-[500px]"
          markers={filtered.map((r) => ({
            id: r.id,
            lng: 0, // Would come from geocoded store_address
            lat: 0,
            label: `${r.store_name}: ${r.item_found}`,
            color:
              getFreshnessScore(r) >= 70
                ? "#10b981"
                : getFreshnessScore(r) >= 40
                  ? "#fbbf24"
                  : "#ef4444",
          }))}
        />
      ) : loading ? (
        <div className="text-center py-16">
          <div className="animate-pulse text-[var(--color-text-muted)]">
            Loading restocks...
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[var(--color-text-muted)]">
            No restocks found
          </p>
          <Link href="/restock/new">
            <Button className="mt-4">Report a restock</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((restock) => {
            const freshness = getFreshnessScore(restock);
            return (
              <Card key={restock.id} className="relative overflow-hidden">
                {/* Freshness bar */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${getFreshnessBarColor(freshness)}`}
                />

                <div className="p-4 pl-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">
                      {restock.store_name}
                    </h3>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {restock.item_found}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                      <span>{formatRelativeTime(restock.reported_at)}</span>
                      {restock.verified_count > 0 && (
                        <span className="flex items-center gap-1 text-[var(--color-success)]">
                          <CheckCircle className="w-3 h-3" />
                          {restock.verified_count} verified
                        </span>
                      )}
                      {restock.category && (
                        <span className="px-1.5 py-0.5 rounded bg-[var(--color-bg-elevated)] text-[10px]">
                          {restock.category}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span
                        className={`text-lg font-bold ${
                          freshness >= 70
                            ? "text-emerald-400"
                            : freshness >= 40
                              ? "text-amber-400"
                              : "text-red-400"
                        }`}
                      >
                        {freshness}%
                      </span>
                      <p className="text-[10px] text-[var(--color-text-muted)]">
                        fresh
                      </p>
                    </div>
                    <button
                      onClick={() => handleVerify(restock.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] hover:bg-[var(--color-accent-subtle)] hover:text-[var(--color-accent)] transition-colors"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
