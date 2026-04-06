"use client";

import { useState } from "react";
import { Calculator, Sparkles, DollarSign, Package, TrendingUp } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

interface ProductOption {
  name: string;
  price: number;
  packsPerBox: number;
  cardsPerPack: number;
  hitRates: Record<string, number>; // rarity -> 1 in X packs
  hitValues: Record<string, number>; // rarity -> avg value $
}

const SAMPLE_PRODUCTS: ProductOption[] = [
  {
    name: "Pokémon Shining Fates Elite Trainer Box",
    price: 65,
    packsPerBox: 10,
    cardsPerPack: 10,
    hitRates: {
      "Shiny Vault": 3,
      "V/VMAX": 6,
      "Secret Rare": 36,
      "Charizard VMAX": 450,
    },
    hitValues: {
      "Shiny Vault": 8,
      "V/VMAX": 15,
      "Secret Rare": 45,
      "Charizard VMAX": 350,
    },
  },
  {
    name: "Pokémon 151 Booster Box",
    price: 145,
    packsPerBox: 36,
    cardsPerPack: 10,
    hitRates: {
      Holo: 3,
      "Full Art": 18,
      "Art Rare": 36,
      "Special Art Rare": 72,
      "Hyper Rare": 144,
    },
    hitValues: {
      Holo: 3,
      "Full Art": 12,
      "Art Rare": 25,
      "Special Art Rare": 80,
      "Hyper Rare": 200,
    },
  },
  {
    name: "Prizm Football Hobby Box",
    price: 800,
    packsPerBox: 12,
    cardsPerPack: 12,
    hitRates: {
      "Silver Prizm": 4,
      "Color Prizm": 12,
      Auto: 24,
      "Numbered /25": 120,
    },
    hitValues: {
      "Silver Prizm": 20,
      "Color Prizm": 50,
      Auto: 80,
      "Numbered /25": 250,
    },
  },
];

export default function PullRateCalculator() {
  const [selected, setSelected] = useState<ProductOption | null>(null);
  const [boxCount, setBoxCount] = useState(1);

  function calculateEV(product: ProductOption, boxes: number): {
    totalCost: number;
    expectedHits: Record<string, number>;
    expectedValue: number;
    ev: number;
    evPerBox: number;
  } {
    const totalPacks = product.packsPerBox * boxes;
    const totalCost = product.price * boxes;
    const expectedHits: Record<string, number> = {};
    let expectedValue = 0;

    for (const rarity of Object.keys(product.hitRates)) {
      const rate = product.hitRates[rarity];
      const hits = totalPacks / rate;
      expectedHits[rarity] = hits;
      expectedValue += hits * (product.hitValues[rarity] ?? 0);
    }

    return {
      totalCost,
      expectedHits,
      expectedValue: Math.round(expectedValue),
      ev: Math.round(expectedValue - totalCost),
      evPerBox: Math.round((expectedValue - totalCost) / boxes),
    };
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Calculator className="w-5 h-5 text-[var(--color-accent)]" />
        Pull Rate Calculator
      </h3>
      <p className="text-sm text-[var(--color-text-muted)]">
        Estimate your expected value before ripping — know the odds
      </p>

      {!selected ? (
        <div className="space-y-2">
          {SAMPLE_PRODUCTS.map((product) => {
            const ev = calculateEV(product, 1);
            return (
              <Card
                key={product.name}
                className="p-4 cursor-pointer hover:border-[var(--color-accent)] transition-colors"
                onClick={() => setSelected(product)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {product.packsPerBox} packs · ${product.price}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-bold ${
                        ev.ev >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {ev.ev >= 0 ? "+" : ""}${ev.ev} EV
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">{selected.name}</h4>
            <button
              onClick={() => setSelected(null)}
              className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              ← Back
            </button>
          </div>

          {/* Box count slider */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Boxes to Open</label>
              <span className="text-lg font-bold">{boxCount}</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={boxCount}
              onChange={(e) => setBoxCount(parseInt(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
            <p className="text-xs text-[var(--color-text-muted)]">
              Total investment: ${(selected.price * boxCount).toLocaleString()} ·{" "}
              {selected.packsPerBox * boxCount} packs
            </p>
          </Card>

          {(() => {
            const ev = calculateEV(selected, boxCount);
            return (
              <>
                {/* EV Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <Card className="p-3 text-center">
                    <DollarSign className="w-4 h-4 text-red-400 mx-auto mb-1" />
                    <p className="text-xs text-[var(--color-text-muted)]">Cost</p>
                    <p className="text-sm font-bold">
                      ${ev.totalCost.toLocaleString()}
                    </p>
                  </Card>
                  <Card className="p-3 text-center">
                    <Sparkles className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Exp. Value
                    </p>
                    <p className="text-sm font-bold">
                      ${ev.expectedValue.toLocaleString()}
                    </p>
                  </Card>
                  <Card className="p-3 text-center">
                    <TrendingUp className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                    <p className="text-xs text-[var(--color-text-muted)]">EV</p>
                    <p
                      className={`text-sm font-bold ${
                        ev.ev >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {ev.ev >= 0 ? "+" : ""}${ev.ev.toLocaleString()}
                    </p>
                  </Card>
                </div>

                {/* Expected hits breakdown */}
                <Card className="p-4 space-y-3">
                  <h5 className="text-sm font-semibold">Expected Pulls</h5>
                  {Object.entries(ev.expectedHits).map(([rarity, count]) => (
                    <div key={rarity} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                        <span className="text-sm">{rarity}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[var(--color-text-muted)]">
                          1 in {selected.hitRates[rarity]} packs
                        </span>
                        <span className="text-sm font-semibold min-w-[40px] text-right">
                          ~{count < 1 ? count.toFixed(2) : count.toFixed(1)}
                        </span>
                        <span className="text-xs text-emerald-400 min-w-[50px] text-right">
                          ~${Math.round(
                            count * (selected.hitValues[rarity] ?? 0)
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </Card>

                {ev.ev < 0 && (
                  <p className="text-xs text-amber-400 text-center">
                    Expected negative EV — but big hits can still make it
                    worthwhile. Luck favors the bold.
                  </p>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
