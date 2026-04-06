"use client";

import { useState, useEffect } from "react";
import { ArrowLeftRight, Search, Inbox, Clock, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ReputationBadge from "@/components/trade/ReputationBadge";
import TradeProposal from "@/components/trade/TradeProposal";
import { CATEGORIES } from "@/config/constants";
import { formatCurrency } from "@/lib/utils";
import type { Item, Trade } from "@/types/database";
import type { Database } from "@/types/database";

interface TradeableItem extends Item {
  profiles?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    reputation_score?: number;
    verified_seller?: boolean;
  };
}

type Tab = "browse" | "incoming" | "outgoing" | "history";

export default function TradesPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("browse");
  const [tradeItems, setTradeItems] = useState<TradeableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<TradeableItem | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadTradeItems();
  }, []);

  const loadTradeItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("items")
      .select("*, profiles:user_id(username, display_name, avatar_url, reputation_score, verified_seller)")
      .eq("is_for_trade", true)
      .order("created_at", { ascending: false })
      .limit(50);

    setTradeItems((data as TradeableItem[]) ?? []);
    setLoading(false);
  };

  const filtered = tradeItems.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "browse", label: "Browse", icon: Search },
    { id: "incoming", label: "Incoming", icon: Inbox },
    { id: "outgoing", label: "Outgoing", icon: Clock },
    { id: "history", label: "History", icon: CheckCircle },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ArrowLeftRight className="w-6 h-6 text-[var(--color-accent)]" />
          Trade Center
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Trade with trusted collectors — every trade builds your reputation
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--color-bg-elevated)]">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === id
                ? "bg-[var(--color-bg-card)] text-[var(--color-text)] shadow-sm"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Browse tab */}
      {tab === "browse" && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items for trade..."
                className="w-full pl-10 pr-3 py-2.5 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2.5 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl text-sm"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Trade items grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl bg-[var(--color-bg-elevated)] animate-pulse"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <ArrowLeftRight className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
              <p className="text-[var(--color-text-muted)]">
                No items available for trade
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-2">
                Mark your items as &quot;available for trade&quot; to start
                matching
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((item) => (
                <Card key={item.id} hover className="overflow-hidden group">
                  <div className="aspect-square bg-[var(--color-bg-elevated)] flex items-center justify-center overflow-hidden">
                    {item.image_urls?.[0] ? (
                      <img
                        src={item.image_urls[0]}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="text-[var(--color-text-muted)] text-xs">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-1.5">
                    <h3 className="text-sm font-semibold truncate">
                      {item.title}
                    </h3>
                    <p className="text-xs text-[var(--color-text-muted)] capitalize">
                      {item.condition}
                      {item.grade_value && ` · ${item.grading_company} ${item.grade_value}`}
                    </p>
                    {item.estimated_value != null && (
                      <p className="text-sm font-medium text-[var(--color-success)]">
                        {formatCurrency(item.estimated_value)}
                      </p>
                    )}
                    {item.profiles && (
                      <div className="flex items-center justify-between pt-1">
                        <p className="text-xs text-[var(--color-text-muted)]">
                          @{item.profiles.username}
                        </p>
                        <ReputationBadge
                          score={item.profiles.reputation_score ?? 50}
                          verifiedSeller={item.profiles.verified_seller}
                          size="sm"
                        />
                      </div>
                    )}
                    {user && item.user_id !== user.id && (
                      <Button
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => setSelectedItem(item)}
                      >
                        <ArrowLeftRight className="w-3 h-3" /> Propose Trade
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Incoming tab */}
      {tab === "incoming" && (
        <TradesList userId={user?.id} type="incoming" />
      )}

      {/* Outgoing tab */}
      {tab === "outgoing" && (
        <TradesList userId={user?.id} type="outgoing" />
      )}

      {/* History tab */}
      {tab === "history" && (
        <TradesList userId={user?.id} type="history" />
      )}

      {/* Trade Proposal Modal */}
      {selectedItem && user && (
        <Modal
          open={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          title="Propose a Trade"
        >
          <TradeProposal
            targetItem={selectedItem}
            userId={user.id}
            onClose={() => setSelectedItem(null)}
            onSubmitted={loadTradeItems}
          />
        </Modal>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// Trades list sub-component
// ───────────────────────────────────────────────────────────────
function TradesList({
  userId,
  type,
}: {
  userId?: string;
  type: "incoming" | "outgoing" | "history";
}) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!userId) return;
    loadTrades();
  }, [userId, type]);

  async function loadTrades() {
    setLoading(true);
    let query = supabase.from("trades").select("*");

    if (type === "incoming") {
      query = query.eq("receiver_id", userId!).in("status", ["pending", "accepted"]);
    } else if (type === "outgoing") {
      query = query.eq("initiator_id", userId!).in("status", ["pending", "accepted"]);
    } else {
      query = query
        .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`)
        .in("status", ["completed", "declined", "cancelled", "disputed"]);
    }

    const { data } = await query.order("created_at", { ascending: false }).limit(20);
    setTrades((data as Trade[]) ?? []);
    setLoading(false);
  }

  const statusColors: Record<string, string> = {
    pending: "text-amber-400",
    accepted: "text-blue-400",
    completed: "text-emerald-400",
    declined: "text-red-400",
    cancelled: "text-[var(--color-text-muted)]",
    disputed: "text-orange-400",
  };

  if (!userId) {
    return (
      <div className="text-center py-16">
        <p className="text-[var(--color-text-muted)]">Sign in to view your trades</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-[var(--color-bg-elevated)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (trades.length === 0) {
    const emptyMessages = {
      incoming: "No incoming trade proposals",
      outgoing: "You haven't sent any trade proposals",
      history: "No completed trades yet",
    };
    return (
      <div className="text-center py-16">
        <ArrowLeftRight className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-3" />
        <p className="text-[var(--color-text-muted)]">{emptyMessages[type]}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {trades.map((trade) => (
        <Card key={trade.id} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ArrowLeftRight className="w-5 h-5 text-[var(--color-accent)]" />
              <div>
                <p className="text-sm font-medium">
                  Trade #{trade.id.slice(0, 8)}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {new Date(trade.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-semibold capitalize ${
                  statusColors[trade.status] ?? ""
                }`}
              >
                {trade.status}
              </span>
              {type === "incoming" && trade.status === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateTradeStatus(trade.id, "accepted")}>
                    Accept
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => updateTradeStatus(trade.id, "declined")}>
                    Decline
                  </Button>
                </div>
              )}
            </div>
          </div>
          {trade.message && (
            <p className="text-xs text-[var(--color-text-muted)] mt-2 italic">
              &quot;{trade.message}&quot;
            </p>
          )}
        </Card>
      ))}
    </div>
  );

  async function updateTradeStatus(tradeId: string, status: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from("trades").update({ status } as any).eq("id", tradeId);
    loadTrades();
  }
}
