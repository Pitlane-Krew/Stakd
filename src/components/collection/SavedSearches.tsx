"use client";

import { useState, useEffect } from "react";
import { Search, Bell, BellOff, Trash2, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface SavedSearch {
  id: string;
  query: string;
  category: string | null;
  notify: boolean;
  created_at: string;
  last_results_count: number;
}

export default function SavedSearches() {
  const { user } = useAuth();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newQuery, setNewQuery] = useState("");
  const supabase = createClient();

  useEffect(() => {
    if (!user) return;
    loadSearches();
  }, [user]);

  const loadSearches = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setSearches(data ?? []);
    setLoading(false);
  };

  const addSearch = async () => {
    if (!user || !newQuery.trim()) return;
    await supabase.from("saved_searches").insert({
      user_id: user.id,
      query: newQuery.trim(),
      notify: true,
      last_results_count: 0,
    });
    setNewQuery("");
    setShowAdd(false);
    loadSearches();
  };

  const toggleNotify = async (id: string, currentNotify: boolean) => {
    await supabase.from("saved_searches").update({ notify: !currentNotify } as any).eq("id", id);
    setSearches(searches.map(s => s.id === id ? { ...s, notify: !currentNotify } : s));
  };

  const removeSearch = async (id: string) => {
    await supabase.from("saved_searches").delete().eq("id", id);
    setSearches(searches.filter(s => s.id !== id));
  };

  if (!user) return null;

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2">
          <Search className="w-5 h-5 text-[var(--color-accent)]" />
          Saved Searches
        </h3>
        <Button size="sm" variant={showAdd ? "ghost" : "outline"} onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAdd ? "Cancel" : "Add"}
        </Button>
      </div>

      {showAdd && (
        <div className="p-3 rounded-xl bg-[var(--color-bg-elevated)] space-y-3">
          <Input
            id="search-query"
            label="Search Query"
            value={newQuery}
            onChange={(e) => setNewQuery(e.target.value)}
            placeholder="PSA 10 Charizard"
            icon={<Search className="w-4 h-4" />}
          />
          <Button size="sm" onClick={addSearch} disabled={!newQuery.trim()}>
            Save Search
          </Button>
        </div>
      )}

      {searches.length === 0 && !loading ? (
        <p className="text-sm text-[var(--color-text-muted)] text-center py-6">
          Save searches to get notified when matching items appear
        </p>
      ) : (
        <div className="space-y-2">
          {searches.map(search => (
            <div key={search.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border-subtle)]">
              <Search className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{search.query}</p>
                {search.last_results_count > 0 && (
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {search.last_results_count} results
                  </p>
                )}
              </div>
              <button
                onClick={() => toggleNotify(search.id, search.notify)}
                className={`p-1.5 rounded-lg transition-colors ${search.notify ? "text-[var(--color-accent)] bg-[var(--color-accent-subtle)]" : "text-[var(--color-text-muted)]"}`}
                title={search.notify ? "Notifications on" : "Notifications off"}
              >
                {search.notify ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </button>
              <button
                onClick={() => removeSearch(search.id)}
                className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
