"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Loader } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTradePresence } from "@/hooks/useTradePresence";
import Button from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface ChatMessage {
  id: string;
  trade_id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
}

interface TradeChatProps {
  tradeId: string;
  otherUserId: string;
  otherUsername: string;
}

export default function TradeChat({ tradeId, otherUserId, otherUsername }: TradeChatProps) {
  const { user } = useAuth();
  const { onlineUsers, setTyping } = useTradePresence(tradeId, user?.id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const otherIsOnline = onlineUsers.has(otherUserId);

  // Load initial messages
  useEffect(() => {
    if (tradeId) {
      loadMessages();
    }
  }, [tradeId]);

  // Setup real-time subscriptions
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel(`trade-chat:${tradeId}`);

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "trade_messages",
        filter: `trade_id=eq.${tradeId}`,
      },
      (payload) => {
        const newMessage = payload.new as ChatMessage;
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === newMessage.id);
          return exists ? prev : [...prev, newMessage];
        });
      }
    );

    channel.on("broadcast", { event: "typing" }, (payload) => {
      // Handle typing indicators from other users
      if (payload.payload.user_id !== user.id) {
        console.log(`${payload.payload.username} is typing...`);
      }
    });

    channelRef.current = channel;
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [tradeId, user?.id, supabase]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadMessages() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("trade_messages")
        .select("*")
        .eq("trade_id", tradeId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (!error && data) {
        setMessages((data as ChatMessage[]) ?? []);
      } else if (error) {
        console.error("Error loading messages:", error);
      }
    } catch (err) {
      console.error("Error loading messages:", err);
      // If table doesn't exist yet, just start with empty messages
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!inputValue.trim() || !user?.id) return;

    setSending(true);
    try {
      const { error } = await supabase.from("trade_messages").insert({
        trade_id: tradeId,
        user_id: user.id,
        username: user.user_metadata?.username || "Unknown",
        message: inputValue.trim(),
      });

      if (!error) {
        setInputValue("");
        setTyping(false);
      } else {
        console.error("Error sending message:", error);
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  }

  function handleInputChange(value: string) {
    setInputValue(value);
    setTyping(value.length > 0);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="w-4 h-4 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-elevated)] rounded-xl border border-[var(--color-border)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">
            {otherUsername}
          </h3>
          <div
            className={`w-2 h-2 rounded-full ${
              otherIsOnline ? "bg-[var(--color-success)]" : "bg-[var(--color-text-muted)]"
            }`}
          />
          <span className="text-xs text-[var(--color-text-muted)]">
            {otherIsOnline ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-[var(--color-text-muted)]">
              Start the conversation
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.user_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                    isOwn
                      ? "bg-[var(--color-accent)] text-white"
                      : "bg-[var(--color-bg-card)] text-[var(--color-text)]"
                  }`}
                >
                  <p>{msg.message}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isOwn
                        ? "text-white/70"
                        : "text-[var(--color-text-muted)]"
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 p-4 border-t border-[var(--color-border)]">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message..."
          className="flex-1 px-3 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
        <Button
          size="icon"
          onClick={sendMessage}
          disabled={!inputValue.trim() || sending}
          loading={sending}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
