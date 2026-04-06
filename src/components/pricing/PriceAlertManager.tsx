"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  BellOff,
  TrendingUp,
  TrendingDown,
  Trash2,
  Plus,
  Loader2,
  Check,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { PriceAlert, CreatePriceAlertInput } from "@/services/alerts";

interface Props {
  userId: string;
  /** Pre-fill for creating an alert on a specific item */
  itemId?: string;
  itemTitle?: string;
  itemCategory?: string;
  currentPrice?: number;
}

export default function PriceAlertManager({
  userId,
  itemId,
  itemTitle,
  itemCategory,
  currentPrice,
}: Props) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState(itemTitle ?? "");
  const [formDirection, setFormDirection] = useState<"above" | "below">("below");
  const [formTarget, setFormTarget] = useState("");

  useEffect(() => {
    loadAlerts();
  }, [userId]);

  async function loadAlerts() {
    setLoading(true);
    try {
      const res = await fetch(`/api/alerts/price?userId=${userId}`);
      const data = await res.json();
      setAlerts(data.alerts ?? []);
    } catch {
      console.error("Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!formTitle.trim() || !formTarget) return;
    setSaving(true);
    try {
      const input: CreatePriceAlertInput = {
        item_id: itemId,
        item_title: formTitle,
        category: itemCategory,
        target_price: parseFloat(formTarget),
        direction: formDirection,
        current_price: currentPrice,
      };
      const res = await fetch("/api/alerts/price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...input }),
      });
      const data = await res.json();
      if (data.alert) {
        setAlerts((prev) => [data.alert, ...prev]);
        setShowForm(false);
        setFormTitle(itemTitle ?? "");
        setFormTarget("");
      }
    } catch {
      console.error("Failed to create alert");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(alertId: string, active: boolean) {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, active } : a))
    );
    await fetch("/api/alerts/price", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId, active }),
    });
  }

  async function handleDelete(alertId: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    await fetch("/api/alerts/price", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId }),
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="w-5 h-5 text-[var(--color-accent)]" />
          Price Alerts
        </h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="w-4 h-4" />
          New Alert
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="p-4 space-y-3">
          {!itemId && (
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Item name (e.g. Charizard VMAX)"
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setFormDirection("below")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                formDirection === "below"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-muted)]"
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              Drops Below
            </button>
            <button
              onClick={() => setFormDirection("above")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                formDirection === "above"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  : "bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-muted)]"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Rises Above
            </button>
          </div>

          <div className="flex gap-2 items-center">
            <span className="text-sm text-[var(--color-text-muted)]">$</span>
            <input
              type="number"
              value={formTarget}
              onChange={(e) => setFormTarget(e.target.value)}
              placeholder="Target price"
              min="0"
              step="0.01"
              className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
            <Button onClick={handleCreate} loading={saving} size="sm">
              <Check className="w-4 h-4" /> Set Alert
            </Button>
          </div>

          {currentPrice && (
            <p className="text-xs text-[var(--color-text-muted)]">
              Current price: ${currentPrice.toLocaleString()}
            </p>
          )}
        </Card>
      )}

      {/* Alert list */}
      {alerts.length === 0 && !showForm && (
        <p className="text-sm text-[var(--color-text-muted)] text-center py-6">
          No price alerts yet. Create one to get notified when prices change.
        </p>
      )}

      <div className="space-y-2">
        {alerts.map((alert) => (
          <Card
            key={alert.id}
            className={`p-3 flex items-center gap-3 transition-opacity ${
              !alert.active ? "opacity-50" : ""
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                alert.triggered
                  ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                  : alert.direction === "below"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-amber-500/15 text-amber-400"
              }`}
            >
              {alert.triggered ? (
                <Check className="w-4 h-4" />
              ) : alert.direction === "below" ? (
                <TrendingDown className="w-4 h-4" />
              ) : (
                <TrendingUp className="w-4 h-4" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{alert.item_title}</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {alert.triggered ? (
                  <span className="text-[var(--color-accent)]">
                    Triggered at ${alert.current_price?.toLocaleString()}
                  </span>
                ) : (
                  <>
                    Alert when {alert.direction === "below" ? "below" : "above"}{" "}
                    ${alert.target_price.toLocaleString()}
                    {alert.current_price != null && (
                      <> · Now ${alert.current_price.toLocaleString()}</>
                    )}
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => handleToggle(alert.id, !alert.active)}
                className="p-1.5 rounded-lg hover:bg-[var(--color-bg-elevated)] transition-colors"
                title={alert.active ? "Pause alert" : "Resume alert"}
              >
                {alert.active ? (
                  <Bell className="w-4 h-4 text-[var(--color-text-muted)]" />
                ) : (
                  <BellOff className="w-4 h-4 text-[var(--color-text-muted)]" />
                )}
              </button>
              <button
                onClick={() => handleDelete(alert.id)}
                className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                title="Delete alert"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
