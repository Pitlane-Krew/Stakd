"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, TrendingUp, TrendingDown, Minus, Plus, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";

interface WatchlistItem {
  id: string;
  title: string;
  category: string;
  target_price: number | null;
  current_price: number | null;
  price_change_7d: number;
  created_at: string;
}

export default function Watchlist() {
  const { user } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("pokemon");
  const [newTargetPrice, setNewTargetPrice] = useState("");
  const [adding, setAdding] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    loadWatchlist();
  }, [user]);

  const loadWatchlist = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("watchlist")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  };

  const addItem = async () => {
    if (!user || !newTitle.trim()) return;
    setAdding(true);
    await supabase.from("watchlist").insert({
      user_id: user.id,
      title: newTitle.trim(),
      category: newCategory,
      target_price: newTargetPrice ? parseFloat(newTargetPrice) : null,
      current_price: null,
      price_change_7d: 0,
    });
    setNewTitle("");
    setNewTargetPrice("");
    setShowAdd(false);
    setAdding(false);
    loadWatchlist();
  };

  const removeItem = async (id: string) => {
    await supabase.from("watchlist").delete().eq("id", id);
    setItems(items.filter(i => i.id !== id));
  };

  if (!user) return null;

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2">
          <Eye className="w-5 h-5 text-[var(--color-accent)]" />
          Watchlist
        </h3>
        <Button size="sm" variant={showAdd ? "ghost" : "outline"} onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAdd ? "Cancel" : "Add"}
        </Button>
      </div>

      {showAdd && (
        <div className="p-3 rounded-xl bg-[var(--color-bg-elevated)] space-y-3">
          <Input
            id="watch-title"
            label="Item Name"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Charizard VMAX Secret Rare"
          />
          <Input
            id="watch-target"
            label="Target Price (optional)"
            value={newTargetPrice}
            onChange={(e) => setNewTargetPrice(e.target.value)}
            placeholder="150.00"
            type="number"
            hint="Get notified when price drops below this"
          />
          <Button size="sm" onClick={addItem} loading={adding} disabled={!newTitle.trim()}>
            Add to Watchlist
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--color-text-muted)]" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] text-center py-6">
          Add items to watch their prices without owning them
        </p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border-subtle)]">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-[var(--color-text-muted)] capitalize">{item.category}</span>
                  {item.target_price && (
                    <span className="text-xs text-[var(--color-warning)]">
                      Target: {formatCurrency(item.target_price)}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                {item.current_price ? (
                  <>
                    <p className="text-sm font-semibold">{formatCurrency(item.current_price)}</p>
                    <p className={`text-xs ${item.price_change_7d > 0 ? "text-[var(--color-success)]" : item.price_change_7d < 0 ? "text-[var(--color-danger)]" : "text-[var(--color-text-muted)]"}`}>
                      {item.price_change_7d > 0 ? "+" : ""}{item.price_change_7d}%
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-[var(--color-text-muted)]">Tracking...</p>
                )}
              </div>
              <button
                onClick={() => removeItem(item.id)}
                className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
