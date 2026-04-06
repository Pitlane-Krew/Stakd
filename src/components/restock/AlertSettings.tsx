"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import { getCategories } from "@/config/category-registry";
import {
  getAlertPreferences,
  createAlertPreference,
  toggleAlertPreference,
  deleteAlertPreference,
  type AlertPreference,
} from "@/services/alerts";

interface Props {
  userId: string;
}

export default function AlertSettings({ userId }: Props) {
  const [prefs, setPrefs] = useState<AlertPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [newRadius, setNewRadius] = useState(25);
  const categories = getCategories();

  useEffect(() => {
    async function load() {
      try {
        const data = await getAlertPreferences(userId);
        setPrefs(data);
      } catch (err) {
        console.error("Failed to load alerts:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  async function handleAdd() {
    if (!newCategory && !newKeyword) return;

    try {
      const created = await createAlertPreference({
        user_id: userId,
        category: newCategory || undefined,
        keyword: newKeyword || undefined,
        radius_miles: newRadius,
      });
      setPrefs((prev) => [created, ...prev]);
      setShowAdd(false);
      setNewCategory("");
      setNewKeyword("");
      setNewRadius(25);
    } catch (err) {
      console.error("Failed to create alert:", err);
    }
  }

  async function handleToggle(id: string, enabled: boolean) {
    try {
      await toggleAlertPreference(id, enabled);
      setPrefs((prev) =>
        prev.map((p) => (p.id === id ? { ...p, enabled } : p))
      );
    } catch (err) {
      console.error("Failed to toggle alert:", err);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteAlertPreference(id);
      setPrefs((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Failed to delete alert:", err);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Bell className="w-4 h-4 text-[var(--color-accent)]" />
          Restock Alerts
        </h3>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-3 h-3" /> Add Alert
        </Button>
      </div>

      {showAdd && (
        <Card className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Category</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm"
            >
              <option value="">Any category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Keyword</label>
            <Input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="e.g., Pokémon 151, Prizm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              Radius: {newRadius} miles
            </label>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={newRadius}
              onChange={(e) => setNewRadius(Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd}>
              Save Alert
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowAdd(false)}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)] animate-pulse">
          Loading alerts...
        </p>
      ) : prefs.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">
          No alerts configured. Add one to get notified about restocks.
        </p>
      ) : (
        <div className="space-y-2">
          {prefs.map((pref) => (
            <Card
              key={pref.id}
              className={`p-3 flex items-center justify-between ${
                !pref.enabled ? "opacity-50" : ""
              }`}
            >
              <div className="space-y-0.5">
                <p className="text-sm font-medium">
                  {pref.category
                    ? categories.find((c) => c.id === pref.category)?.label ??
                      pref.category
                    : "Any category"}
                  {pref.keyword && (
                    <span className="text-[var(--color-text-muted)]">
                      {" "}
                      &middot; &quot;{pref.keyword}&quot;
                    </span>
                  )}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Within {pref.radius_miles} miles
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(pref.id, !pref.enabled)}
                  className="p-1.5 rounded-md hover:bg-[var(--color-bg-elevated)] transition-colors"
                  title={pref.enabled ? "Disable" : "Enable"}
                >
                  {pref.enabled ? (
                    <Bell className="w-4 h-4 text-[var(--color-accent)]" />
                  ) : (
                    <BellOff className="w-4 h-4 text-[var(--color-text-muted)]" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(pref.id)}
                  className="p-1.5 rounded-md hover:bg-red-500/10 text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
