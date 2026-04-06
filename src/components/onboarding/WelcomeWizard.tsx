"use client";

import { useState } from "react";
import {
  Sparkles,
  ChevronRight,
  Camera,
  Layers,
  Bell,
  Users,
  Check,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { getCategories } from "@/config/category-registry";

interface Props {
  onComplete: (preferences: WizardResult) => void;
}

export interface WizardResult {
  displayName: string;
  selectedCategories: string[];
  importMethod: "photo" | "csv" | "manual" | "skip";
  enableAlerts: boolean;
}

type Step = "welcome" | "categories" | "import" | "alerts" | "done";

const STEPS: Step[] = ["welcome", "categories", "import", "alerts", "done"];

export default function WelcomeWizard({ onComplete }: Props) {
  const [step, setStep] = useState<Step>("welcome");
  const [displayName, setDisplayName] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [importMethod, setImportMethod] = useState<WizardResult["importMethod"]>("skip");
  const [enableAlerts, setEnableAlerts] = useState(true);

  const categories = getCategories();
  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  function next() {
    const nextIdx = STEPS.indexOf(step) + 1;
    if (nextIdx < STEPS.length) {
      setStep(STEPS[nextIdx]);
    }
  }

  function back() {
    const prevIdx = STEPS.indexOf(step) - 1;
    if (prevIdx >= 0) {
      setStep(STEPS[prevIdx]);
    }
  }

  function finish() {
    onComplete({
      displayName,
      selectedCategories,
      importMethod,
      enableAlerts,
    });
  }

  function toggleCategory(id: string) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Progress bar */}
      <div className="w-full h-1 rounded-full bg-[var(--color-bg-elevated)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step: Welcome */}
      {step === "welcome" && (
        <div className="text-center space-y-6 py-8">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-accent)]/15 flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8 text-[var(--color-accent)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Welcome to STAKD</h1>
            <p className="text-[var(--color-text-muted)] mt-2">
              Your collection deserves a home. Let&apos;s get you set up in under a
              minute.
            </p>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="What should we call you?"
              className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-center text-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              autoFocus
            />
            <Button onClick={next} disabled={!displayName.trim()} className="w-full">
              Get Started <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step: Categories */}
      {step === "categories" && (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-bold">What do you collect?</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Select all that apply — you can always change these later
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat) => {
              const selected = selectedCategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selected
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                      : "border-[var(--color-border)] bg-[var(--color-bg-surface)] hover:border-[var(--color-accent)]/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{cat.icon}</span>
                    {selected && (
                      <Check className="w-4 h-4 text-[var(--color-accent)]" />
                    )}
                  </div>
                  <p className="text-sm font-semibold mt-2">{cat.label}</p>
                </button>
              );
            })}
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={back} className="flex-1">
              Back
            </Button>
            <Button
              onClick={next}
              disabled={selectedCategories.length === 0}
              className="flex-1"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step: Import method */}
      {step === "import" && (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-bold">Add your first items</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              How would you like to start building your collection?
            </p>
          </div>

          <div className="space-y-2">
            {[
              {
                id: "photo" as const,
                icon: <Camera className="w-6 h-6" />,
                title: "Photo Scan",
                desc: "Snap a photo of your cards, figures, or shelf",
              },
              {
                id: "csv" as const,
                icon: <Layers className="w-6 h-6" />,
                title: "Import Spreadsheet",
                desc: "Upload a CSV from another app or tracker",
              },
              {
                id: "manual" as const,
                icon: <Sparkles className="w-6 h-6" />,
                title: "Quick List",
                desc: "Type or paste item names — AI fills in the details",
              },
              {
                id: "skip" as const,
                icon: <ChevronRight className="w-6 h-6" />,
                title: "Start Empty",
                desc: "I'll add items manually later",
              },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setImportMethod(opt.id);
                  next();
                }}
                className={`w-full p-4 rounded-xl border text-left flex items-center gap-4 transition-all ${
                  importMethod === opt.id
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                    : "border-[var(--color-border)] bg-[var(--color-bg-surface)] hover:border-[var(--color-accent)]/50"
                }`}
              >
                <div className="text-[var(--color-accent)]">{opt.icon}</div>
                <div>
                  <p className="text-sm font-semibold">{opt.title}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {opt.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <Button variant="secondary" onClick={back} className="w-full">
            Back
          </Button>
        </div>
      )}

      {/* Step: Alerts */}
      {step === "alerts" && (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-bold">Stay in the loop</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Get notified about price changes and local restocks
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setEnableAlerts(true)}
              className={`w-full p-5 rounded-xl border text-left flex items-center gap-4 transition-all ${
                enableAlerts
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                  : "border-[var(--color-border)] bg-[var(--color-bg-surface)]"
              }`}
            >
              <Bell className="w-8 h-8 text-[var(--color-accent)]" />
              <div>
                <p className="font-semibold">Enable Smart Alerts</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Price drops, restock sightings near you, and friend activity
                </p>
              </div>
            </button>

            <button
              onClick={() => setEnableAlerts(false)}
              className={`w-full p-5 rounded-xl border text-left flex items-center gap-4 transition-all ${
                !enableAlerts
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                  : "border-[var(--color-border)] bg-[var(--color-bg-surface)]"
              }`}
            >
              <Users className="w-8 h-8 text-[var(--color-text-muted)]" />
              <div>
                <p className="font-semibold">Maybe Later</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  You can enable alerts anytime from settings
                </p>
              </div>
            </button>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={back} className="flex-1">
              Back
            </Button>
            <Button onClick={next} className="flex-1">
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <div className="text-center space-y-6 py-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">You&apos;re all set!</h1>
            <p className="text-[var(--color-text-muted)] mt-2">
              Welcome to STAKD, {displayName}. Your collector journey starts now.
            </p>
          </div>
          <Button onClick={finish} className="w-full">
            <Sparkles className="w-4 h-4" />
            Enter STAKD
          </Button>
        </div>
      )}
    </div>
  );
}
