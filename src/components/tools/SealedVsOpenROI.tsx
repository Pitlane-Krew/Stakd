"use client";

import { useState } from "react";
import { Lock, Unlock, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import Card from "@/components/ui/Card";

interface ROIScenario {
  label: string;
  purchasePrice: number;
  currentSealedValue: number;
  expectedOpenValue: number; // EV from opening
  sealedAppreciation: number; // % per year expected
  timeHorizonYears: number;
}

const SAMPLE_SCENARIOS: ROIScenario[] = [
  {
    label: "Pokémon 151 Booster Box",
    purchasePrice: 145,
    currentSealedValue: 220,
    expectedOpenValue: 180,
    sealedAppreciation: 25,
    timeHorizonYears: 3,
  },
  {
    label: "Shining Fates ETB",
    purchasePrice: 50,
    currentSealedValue: 95,
    expectedOpenValue: 65,
    sealedAppreciation: 30,
    timeHorizonYears: 3,
  },
  {
    label: "Prizm 2020 Football Hobby",
    purchasePrice: 800,
    currentSealedValue: 1400,
    expectedOpenValue: 950,
    sealedAppreciation: 20,
    timeHorizonYears: 3,
  },
];

export default function SealedVsOpenROI() {
  const [scenario, setScenario] = useState<ROIScenario>(SAMPLE_SCENARIOS[0]);
  const [customMode, setCustomMode] = useState(false);

  // Compute projections
  const years = [1, 2, 3, 5];
  const sealedProjections = years.map((y) => ({
    year: y,
    value: Math.round(
      scenario.currentSealedValue *
        Math.pow(1 + scenario.sealedAppreciation / 100, y)
    ),
  }));

  const openROI =
    ((scenario.expectedOpenValue - scenario.purchasePrice) /
      scenario.purchasePrice) *
    100;
  const sealedROI =
    ((scenario.currentSealedValue - scenario.purchasePrice) /
      scenario.purchasePrice) *
    100;
  const holdRecommended = scenario.currentSealedValue > scenario.expectedOpenValue;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-[var(--color-accent)]" />
        Sealed vs Open ROI
      </h3>
      <p className="text-sm text-[var(--color-text-muted)]">
        Should you rip it or keep it sealed? Compare expected returns.
      </p>

      {/* Scenario picker */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SAMPLE_SCENARIOS.map((s) => (
          <button
            key={s.label}
            onClick={() => {
              setScenario(s);
              setCustomMode(false);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              scenario.label === s.label && !customMode
                ? "bg-[var(--color-accent)] text-white"
                : "bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {s.label}
          </button>
        ))}
        <button
          onClick={() => setCustomMode(true)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            customMode
              ? "bg-[var(--color-accent)] text-white"
              : "bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]"
          }`}
        >
          Custom
        </button>
      </div>

      {/* Custom inputs */}
      {customMode && (
        <Card className="p-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Purchase Price</label>
            <input
              type="number"
              value={scenario.purchasePrice}
              onChange={(e) =>
                setScenario({ ...scenario, purchasePrice: +e.target.value })
              }
              className="w-full mt-1 px-2 py-1.5 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Current Sealed Value</label>
            <input
              type="number"
              value={scenario.currentSealedValue}
              onChange={(e) =>
                setScenario({ ...scenario, currentSealedValue: +e.target.value })
              }
              className="w-full mt-1 px-2 py-1.5 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Expected Open Value (EV)</label>
            <input
              type="number"
              value={scenario.expectedOpenValue}
              onChange={(e) =>
                setScenario({ ...scenario, expectedOpenValue: +e.target.value })
              }
              className="w-full mt-1 px-2 py-1.5 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--color-text-muted)]">Annual Appreciation %</label>
            <input
              type="number"
              value={scenario.sealedAppreciation}
              onChange={(e) =>
                setScenario({ ...scenario, sealedAppreciation: +e.target.value })
              }
              className="w-full mt-1 px-2 py-1.5 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm"
            />
          </div>
        </Card>
      )}

      {/* Verdict */}
      <Card
        className={`p-5 text-center ${
          holdRecommended
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-amber-500/30 bg-amber-500/5"
        }`}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          {holdRecommended ? (
            <Lock className="w-6 h-6 text-emerald-400" />
          ) : (
            <Unlock className="w-6 h-6 text-amber-400" />
          )}
          <span className="text-lg font-bold">
            {holdRecommended ? "Keep Sealed" : "Consider Opening"}
          </span>
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">
          {holdRecommended
            ? `Sealed value ($${scenario.currentSealedValue}) exceeds expected open value ($${scenario.expectedOpenValue}) — holding earns more.`
            : `Expected open value ($${scenario.expectedOpenValue}) is competitive with sealed ($${scenario.currentSealedValue}) — ripping could pay off.`}
        </p>
      </Card>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Unlock className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold">Open Now</span>
          </div>
          <p className="text-2xl font-bold">
            ${scenario.expectedOpenValue.toLocaleString()}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Expected value from pulls
          </p>
          <p
            className={`text-sm font-semibold ${
              openROI >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {openROI >= 0 ? "+" : ""}
            {openROI.toFixed(0)}% ROI
          </p>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold">Keep Sealed</span>
          </div>
          <p className="text-2xl font-bold">
            ${scenario.currentSealedValue.toLocaleString()}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Current market value
          </p>
          <p
            className={`text-sm font-semibold ${
              sealedROI >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {sealedROI >= 0 ? "+" : ""}
            {sealedROI.toFixed(0)}% ROI from purchase
          </p>
        </Card>
      </div>

      {/* Future projections (sealed) */}
      <Card className="p-4 space-y-3">
        <h5 className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          Sealed Value Projection ({scenario.sealedAppreciation}%/yr)
        </h5>
        {sealedProjections.map((p) => (
          <div key={p.year} className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-muted)]">
              Year {p.year}
            </span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 rounded-full bg-[var(--color-bg-elevated)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-400"
                  style={{
                    width: `${Math.min(
                      (p.value / sealedProjections[sealedProjections.length - 1].value) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
              <span className="text-sm font-semibold min-w-[60px] text-right">
                ${p.value.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
