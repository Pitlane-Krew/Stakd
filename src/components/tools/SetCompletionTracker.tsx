"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Search, Trophy, Target } from "lucide-react";
import Card from "@/components/ui/Card";

interface SetCard {
  number: string;
  name: string;
  owned: boolean;
  estimatedValue?: number;
}

interface SetData {
  name: string;
  totalCards: number;
  cards: SetCard[];
}

interface Props {
  /** Items the user already owns (titles) */
  ownedItems: string[];
  category?: string;
}

// Known sets for demo / AI-enrichment
const POPULAR_SETS: Record<string, string[]> = {
  "Shining Fates": [
    "Cinderace V", "Cinderace VMAX", "Lapras V", "Lapras VMAX",
    "Cramorant V", "Cramorant VMAX", "Grimmsnarl V", "Grimmsnarl VMAX",
    "Indeedee V", "Ditto V", "Ditto VMAX", "Ball Guy",
    "Charizard VMAX (SV107)", "Suicune (SV022)", "Eevee (SV041)",
  ],
  "Prizm 2020 Football": [
    "Justin Herbert RC", "Joe Burrow RC", "Tua Tagovailoa RC",
    "CeeDee Lamb RC", "Patrick Mahomes", "Josh Allen", "Lamar Jackson",
    "Deshaun Watson", "Russell Wilson", "Kyler Murray",
  ],
};

export default function SetCompletionTracker({ ownedItems, category }: Props) {
  const [selectedSet, setSelectedSet] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [customSetName, setCustomSetName] = useState("");
  const [customCards, setCustomCards] = useState("");

  function getSetData(setName: string): SetData {
    const knownCards = POPULAR_SETS[setName] ?? [];
    const cards: SetCard[] = knownCards.map((name) => ({
      number: "",
      name,
      owned: ownedItems.some(
        (owned) =>
          owned.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(owned.toLowerCase())
      ),
    }));

    return {
      name: setName,
      totalCards: cards.length,
      cards,
    };
  }

  const setNames = Object.keys(POPULAR_SETS);
  const filtered = search
    ? setNames.filter((s) => s.toLowerCase().includes(search.toLowerCase()))
    : setNames;

  const currentSet = selectedSet ? getSetData(selectedSet) : null;
  const ownedCount = currentSet?.cards.filter((c) => c.owned).length ?? 0;
  const completionPct = currentSet
    ? Math.round((ownedCount / currentSet.totalCards) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-400" />
        Set Completion Tracker
      </h3>

      {!selectedSet ? (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sets..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
          </div>

          <div className="space-y-2">
            {filtered.map((name) => {
              const data = getSetData(name);
              const owned = data.cards.filter((c) => c.owned).length;
              const pct = Math.round((owned / data.totalCards) * 100);
              return (
                <Card
                  key={name}
                  className="p-3 cursor-pointer hover:border-[var(--color-accent)] transition-colors"
                  onClick={() => setSelectedSet(name)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{name}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {owned}/{data.totalCards} owned
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 rounded-full bg-[var(--color-bg-elevated)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor:
                              pct === 100
                                ? "#10b981"
                                : pct >= 50
                                  ? "#f59e0b"
                                  : "var(--color-accent)",
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold min-w-[32px] text-right">
                        {pct}%
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">{currentSet!.name}</h4>
              <p className="text-sm text-[var(--color-text-muted)]">
                {ownedCount}/{currentSet!.totalCards} collected
              </p>
            </div>
            <button
              onClick={() => setSelectedSet(null)}
              className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              ← All Sets
            </button>
          </div>

          {/* Progress ring */}
          <Card className="p-5 flex items-center justify-center gap-6">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="var(--color-bg-elevated)"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke={completionPct === 100 ? "#10b981" : "var(--color-accent)"}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${completionPct * 2.64} 264`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
                {completionPct}%
              </span>
            </div>
            <div className="text-sm space-y-1">
              <p>
                <span className="text-emerald-400 font-semibold">{ownedCount}</span> owned
              </p>
              <p>
                <span className="text-amber-400 font-semibold">
                  {currentSet!.totalCards - ownedCount}
                </span>{" "}
                missing
              </p>
              {completionPct === 100 && (
                <p className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Trophy className="w-4 h-4" /> Complete!
                </p>
              )}
            </div>
          </Card>

          {/* Card checklist */}
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {currentSet!.cards.map((card, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  card.owned
                    ? "bg-emerald-500/10"
                    : "bg-[var(--color-bg-surface)]"
                }`}
              >
                {card.owned ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-[var(--color-text-muted)] flex-shrink-0" />
                )}
                <span
                  className={
                    card.owned ? "text-emerald-300" : "text-[var(--color-text-muted)]"
                  }
                >
                  {card.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
