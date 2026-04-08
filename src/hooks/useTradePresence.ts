"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface PresenceState {
  user_id: string;
  typing?: boolean;
  last_seen?: string;
}

export interface UseTradePresenceReturn {
  onlineUsers: Set<string>;
  isOnline: (userId: string) => boolean;
  setTyping: (typing: boolean) => void;
}

export function useTradePresence(
  tradeId: string | undefined,
  userId: string | undefined
): UseTradePresenceReturn {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const supabaseRef = useRef(createClient());
  const channelRef = useRef<RealtimeChannel | null>(null);

  const supabase = supabaseRef.current;

  const setTyping = useCallback(
    async (typing: boolean) => {
      if (!channelRef.current || !userId) return;

      try {
        await channelRef.current.track({
          user_id: userId,
          typing,
          last_seen: new Date().toISOString(),
        } as PresenceState);
      } catch (err) {
        console.error("Error updating presence:", err);
      }
    },
    [userId]
  );

  const isOnline = useCallback(
    (checkUserId: string) => {
      return onlineUsers.has(checkUserId);
    },
    [onlineUsers]
  );

  useEffect(() => {
    if (!tradeId || !userId) return;

    const channel = supabase.channel(`trade:${tradeId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: userId },
      },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const users = new Set<string>();

      Object.values(state).forEach((presences) => {
        presences.forEach((presence: PresenceState) => {
          users.add(presence.user_id);
        });
      });

      setOnlineUsers(users);
    });

    channel.on("presence", { event: "join" }, ({ key, newPresences }) => {
      newPresences.forEach((presence: PresenceState) => {
        setOnlineUsers((prev) => new Set([...prev, presence.user_id]));
      });
    });

    channel.on("presence", { event: "leave" }, ({ key, leftPresences }) => {
      leftPresences.forEach((presence: PresenceState) => {
        setOnlineUsers((prev) => {
          const updated = new Set(prev);
          updated.delete(presence.user_id);
          return updated;
        });
      });
    });

    channelRef.current = channel;

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        try {
          await channel.track({
            user_id: userId,
            typing: false,
            last_seen: new Date().toISOString(),
          } as PresenceState);
        } catch (err) {
          console.error("Error tracking presence:", err);
        }
      }
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tradeId, userId, supabase]);

  return { onlineUsers, isOnline, setTyping };
}
