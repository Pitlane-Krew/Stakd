"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Trade } from "@/types/database";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface UseRealtimeTradesReturn {
  trades: Trade[];
  incomingCount: number;
  outgoingCount: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useRealtimeTrades(userId: string | undefined): UseRealtimeTradesReturn {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [incomingCount, setIncomingCount] = useState(0);
  const [outgoingCount, setOutgoingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());
  const channelRef = useRef<RealtimeChannel | null>(null);

  const supabase = supabaseRef.current;

  const loadTrades = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("trades")
        .select("*")
        .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        console.error("Error loading trades:", fetchError);
      } else {
        const allTrades = (data as Trade[]) ?? [];
        setTrades(allTrades);
        setError(null);

        const incoming = allTrades.filter(
          (t) => t.receiver_id === userId && ["pending", "accepted"].includes(t.status)
        ).length;
        const outgoing = allTrades.filter(
          (t) => t.initiator_id === userId && ["pending", "accepted"].includes(t.status)
        ).length;

        setIncomingCount(incoming);
        setOutgoingCount(outgoing);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("Error loading trades:", errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId, supabase]);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`trades:${userId}`);

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "trades",
        filter: `initiator_id=eq.${userId},receiver_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.eventType === "INSERT") {
          const newTrade = payload.new as Trade;
          setTrades((prev) => [newTrade, ...prev]);

          if (newTrade.receiver_id === userId && ["pending", "accepted"].includes(newTrade.status)) {
            setIncomingCount((prev) => prev + 1);
          }
          if (newTrade.initiator_id === userId && ["pending", "accepted"].includes(newTrade.status)) {
            setOutgoingCount((prev) => prev + 1);
          }
        } else if (payload.eventType === "UPDATE") {
          const updatedTrade = payload.new as Trade;
          const oldTrade = payload.old as Trade;

          setTrades((prev) =>
            prev.map((t) => (t.id === updatedTrade.id ? updatedTrade : t))
          );

          const wasIncomingPending =
            oldTrade.receiver_id === userId &&
            ["pending", "accepted"].includes(oldTrade.status);
          const isIncomingPending =
            updatedTrade.receiver_id === userId &&
            ["pending", "accepted"].includes(updatedTrade.status);

          if (wasIncomingPending && !isIncomingPending) {
            setIncomingCount((prev) => Math.max(0, prev - 1));
          } else if (!wasIncomingPending && isIncomingPending) {
            setIncomingCount((prev) => prev + 1);
          }

          const wasOutgoingPending =
            oldTrade.initiator_id === userId &&
            ["pending", "accepted"].includes(oldTrade.status);
          const isOutgoingPending =
            updatedTrade.initiator_id === userId &&
            ["pending", "accepted"].includes(updatedTrade.status);

          if (wasOutgoingPending && !isOutgoingPending) {
            setOutgoingCount((prev) => Math.max(0, prev - 1));
          } else if (!wasOutgoingPending && isOutgoingPending) {
            setOutgoingCount((prev) => prev + 1);
          }
        } else if (payload.eventType === "DELETE") {
          const deletedTrade = payload.old as Trade;
          setTrades((prev) => prev.filter((t) => t.id !== deletedTrade.id));

          if (
            deletedTrade.receiver_id === userId &&
            ["pending", "accepted"].includes(deletedTrade.status)
          ) {
            setIncomingCount((prev) => Math.max(0, prev - 1));
          }
          if (
            deletedTrade.initiator_id === userId &&
            ["pending", "accepted"].includes(deletedTrade.status)
          ) {
            setOutgoingCount((prev) => Math.max(0, prev - 1));
          }
        }
      }
    );

    channelRef.current = channel.subscribe((status) => {
      if (status === "CLOSED") {
        console.log("Realtime subscription closed");
      }
    });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId, supabase]);

  return { trades, incomingCount, outgoingCount, loading, error, refetch: loadTrades };
}
