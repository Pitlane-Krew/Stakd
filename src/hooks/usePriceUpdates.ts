"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface PriceSnapshot {
  id: string;
  itemId: string;
  avgPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  saleCount: number;
  trend: "up" | "down" | "stable";
  snapshotDate: string;
  createdAt: string;
}

export interface UsePriceUpdatesReturn {
  /** Latest price data for the item */
  price: PriceSnapshot | null;
  /** Historical snapshots for charting (7-day window) */
  history: PriceSnapshot[];
  /** Is data currently loading */
  loading: boolean;
  /** Any subscription errors */
  error: string | null;
  /** Manual refetch trigger */
  refetch: () => Promise<void>;
  /** Current price change indicator */
  priceChange: number | null;
  /** Percentage change from 7 days ago */
  percentChange: number | null;
}

/**
 * Hook to subscribe to real-time price updates for a collectible item.
 *
 * Maintains a 7-day price history and detects when prices update.
 * Automatically unsubscribes on cleanup.
 */
export function usePriceUpdates(itemId: string | undefined): UsePriceUpdatesReturn {
  const [price, setPrice] = useState<PriceSnapshot | null>(null);
  const [history, setHistory] = useState<PriceSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabaseRef = useRef(createClient());
  const channelRef = useRef<RealtimeChannel | null>(null);

  const supabase = supabaseRef.current;

  const loadPriceHistory = useCallback(async () => {
    if (!itemId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get last 7 days of price snapshots
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: snapshots, error: fetchError } = await supabase
        .from("price_snapshots")
        .select("*")
        .eq("item_id", itemId)
        .gte("snapshot_date", sevenDaysAgo.toISOString().split("T")[0])
        .order("snapshot_date", { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
        console.error("Error loading price history:", fetchError);
      } else {
        const formattedSnapshots: PriceSnapshot[] = (snapshots ?? []).map((s: any) => ({
          id: s.id,
          itemId: s.item_id,
          avgPrice: s.avg_price,
          minPrice: s.min_price,
          maxPrice: s.max_price,
          saleCount: s.sale_count || 0,
          trend: s.trend || "stable",
          snapshotDate: s.snapshot_date,
          createdAt: s.created_at,
        }));

        setHistory(formattedSnapshots);

        // Set current price as the most recent snapshot
        if (formattedSnapshots.length > 0) {
          setPrice(formattedSnapshots[formattedSnapshots.length - 1]);
        }

        setError(null);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      console.error("Error loading price history:", errorMsg);
    } finally {
      setLoading(false);
    }
  }, [itemId, supabase]);

  // Initial load
  useEffect(() => {
    loadPriceHistory();
  }, [loadPriceHistory]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!itemId) return;

    const channel = supabase.channel(`prices:${itemId}`);

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "price_snapshots",
        filter: `item_id=eq.${itemId}`,
      },
      (payload) => {
        const newSnapshot: PriceSnapshot = {
          id: payload.new.id,
          itemId: payload.new.item_id,
          avgPrice: payload.new.avg_price,
          minPrice: payload.new.min_price,
          maxPrice: payload.new.max_price,
          saleCount: payload.new.sale_count || 0,
          trend: payload.new.trend || "stable",
          snapshotDate: payload.new.snapshot_date,
          createdAt: payload.new.created_at,
        };

        // Add to history and update current price
        setHistory((prev) => {
          const updated = [...prev, newSnapshot];
          // Keep only 7 days of history
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 7);
          return updated.filter(
            (s) => new Date(s.snapshotDate) >= cutoff
          );
        });

        setPrice(newSnapshot);
      }
    );

    // Also listen for updates to price_history for real-time changes
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "price_history",
        filter: `item_id=eq.${itemId}`,
      },
      (payload) => {
        // Trigger a refetch of latest snapshot
        // In production, you might batch these
        loadPriceHistory();
      }
    );

    channelRef.current = channel.subscribe((status) => {
      if (status === "CLOSED") {
        console.log(`Price updates subscription closed for item ${itemId}`);
      } else if (status === "CHANNEL_ERROR") {
        setError("Connection error to price updates");
      }
    });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [itemId, supabase, loadPriceHistory]);

  // Calculate price change metrics
  const priceChange = price && history.length > 1
    ? price.avgPrice && history[0].avgPrice
      ? price.avgPrice - history[0].avgPrice
      : null
    : null;

  const percentChange = price && history.length > 1
    ? price.avgPrice && history[0].avgPrice && history[0].avgPrice > 0
      ? (priceChange! / history[0].avgPrice) * 100
      : null
    : null;

  return {
    price,
    history,
    loading,
    error,
    refetch: loadPriceHistory,
    priceChange,
    percentChange,
  };
}
