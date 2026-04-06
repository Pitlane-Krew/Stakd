"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeftRight,
  Plus,
  X,
  DollarSign,
  ShieldCheck,
  Star,
  Send,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import type { Item } from "@/types/database";

interface Props {
  /** The item the current user wants to trade for */
  targetItem: Item & {
    profiles?: { username: string; display_name: string | null; reputation_score?: number };
  };
  /** Current user's ID */
  userId: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

export default function TradeProposal({ targetItem, userId, onClose, onSubmitted }: Props) {
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [cashOffer, setCashOffer] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadMyItems();
  }, []);

  async function loadMyItems() {
    const supabase = createClient();
    const { data } = await supabase
      .from("items")
      .select("*")
      .eq("user_id", userId)
      .order("estimated_value", { ascending: false })
      .limit(50);
    setMyItems(data ?? []);
    setLoading(false);
  }

  function toggleItem(id: string) {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const selectedValue = myItems
    .filter((i) => selectedItems.includes(i.id))
    .reduce((s, i) => s + (i.estimated_value ?? 0), 0);

  const targetValue = targetItem.estimated_value ?? 0;
  const diff = targetValue - selectedValue - (parseFloat(cashOffer) || 0);

  async function handleSubmit() {
    if (selectedItems.length === 0 && !cashOffer) return;
    setSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.from("trades").insert({
      initiator_id: userId,
      receiver_id: targetItem.user_id,
      initiator_items: selectedItems,
      receiver_items: [targetItem.id],
      initiator_cash: parseFloat(cashOffer) || 0,
      message: message || null,
    });

    setSubmitting(false);
    if (!error) {
      onSubmitted?.();
      onClose();
    }
  }

  const receiverProfile = targetItem.profiles;

  return (
    <div className="space-y-5">
      {/* Target item */}
      <div>
        <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">
          You want
        </p>
        <Card className="p-3 flex items-center gap-3 border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5">
          {targetItem.image_urls?.[0] && (
            <img
              src={targetItem.image_urls[0]}
              alt={targetItem.title}
              className="w-14 h-14 rounded-lg object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{targetItem.title}</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {receiverProfile && (
                <span className="inline-flex items-center gap-1">
                  @{receiverProfile.username}
                  {(receiverProfile.reputation_score ?? 0) >= 80 && (
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  )}
                </span>
              )}
            </p>
          </div>
          <p className="text-sm font-bold text-[var(--color-success)]">
            {formatCurrency(targetValue)}
          </p>
        </Card>
      </div>

      {/* Your offer */}
      <div>
        <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">
          Your offer — select items to trade
        </p>
        {loading ? (
          <div className="text-sm text-[var(--color-text-muted)]">Loading your items...</div>
        ) : myItems.length === 0 ? (
          <div className="text-sm text-[var(--color-text-muted)]">
            You don&apos;t have any items yet. Add items to your collection first.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {myItems.map((item) => {
              const selected = selectedItems.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                    selected
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                      : "border-[var(--color-border)] hover:border-[var(--color-accent)]/50"
                  }`}
                >
                  {item.image_urls?.[0] ? (
                    <img
                      src={item.image_urls[0]}
                      alt={item.title}
                      className="w-10 h-10 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-[var(--color-bg-elevated)] flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{item.title}</p>
                    <p className="text-xs text-[var(--color-success)]">
                      {formatCurrency(item.estimated_value)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Cash add */}
      <div className="flex items-center gap-3">
        <DollarSign className="w-4 h-4 text-[var(--color-text-muted)]" />
        <input
          type="number"
          value={cashOffer}
          onChange={(e) => setCashOffer(e.target.value)}
          placeholder="Add cash (optional)"
          className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm"
        />
      </div>

      {/* Value comparison */}
      <div className="rounded-lg bg-[var(--color-bg-elevated)] p-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-[var(--color-text-muted)]">Their item</span>
          <span>{formatCurrency(targetValue)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--color-text-muted)]">Your offer</span>
          <span>{formatCurrency(selectedValue + (parseFloat(cashOffer) || 0))}</span>
        </div>
        <div className="border-t border-[var(--color-border)] pt-1 flex justify-between font-semibold">
          <span>Difference</span>
          <span className={diff > 0 ? "text-red-400" : "text-emerald-400"}>
            {diff > 0 ? "-" : "+"}${Math.abs(diff).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Message */}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Add a message (optional)"
        rows={2}
        className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm resize-none"
      />

      {/* Submit */}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting || (selectedItems.length === 0 && !cashOffer)}
          className="flex-1"
        >
          <Send className="w-4 h-4" />
          {submitting ? "Sending..." : "Send Proposal"}
        </Button>
      </div>
    </div>
  );
}
