"use client";

import { useState } from "react";
import {
  Calculator,
  Trophy,
  BarChart3,
  QrCode,
  Lock,
  Shield,
  Bell,
  Sparkles,
} from "lucide-react";
import Card from "@/components/ui/Card";
import PullRateCalculator from "@/components/tools/PullRateCalculator";
import SetCompletionTracker from "@/components/tools/SetCompletionTracker";
import SealedVsOpenROI from "@/components/tools/SealedVsOpenROI";
import QRCodeLabel from "@/components/tools/QRCodeLabel";
import UpgradeGate from "@/components/tier/UpgradeGate";
import { useTier } from "@/hooks/useTier";

type Tool =
  | "pull-rate"
  | "set-tracker"
  | "sealed-roi"
  | "qr-labels"
  | null;

const TOOLS: {
  id: Tool & string;
  icon: React.ReactNode;
  color: string;
  title: string;
  desc: string;
  pro?: boolean;
}[] = [
  {
    id: "pull-rate",
    icon: <Calculator className="w-6 h-6" />,
    color: "text-[var(--color-accent)]",
    title: "Pull Rate Calculator",
    desc: "Estimate expected value before ripping boxes",
  },
  {
    id: "set-tracker",
    icon: <Trophy className="w-6 h-6" />,
    color: "text-amber-400",
    title: "Set Completion",
    desc: "Track progress toward completing sets",
  },
  {
    id: "sealed-roi",
    icon: <Lock className="w-6 h-6" />,
    color: "text-emerald-400",
    title: "Sealed vs Open ROI",
    desc: "Should you rip it or keep it sealed?",
    pro: true,
  },
  {
    id: "qr-labels",
    icon: <QrCode className="w-6 h-6" />,
    color: "text-purple-400",
    title: "QR Code Labels",
    desc: "Generate scannable labels for your display",
    pro: true,
  },
];

export default function ToolsPage() {
  const [activeTool, setActiveTool] = useState<Tool>(null);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-[var(--color-accent)]" />
          Collector Tools
        </h1>
        <p className="text-[var(--color-text-muted)] mt-1">
          Premium tools to help you make smarter collecting decisions
        </p>
      </div>

      {!activeTool ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TOOLS.map((tool) => (
            <Card
              key={tool.id}
              className="p-5 cursor-pointer hover:border-[var(--color-accent)] transition-colors space-y-3"
              onClick={() => setActiveTool(tool.id)}
            >
              <div className="flex items-center justify-between">
                <div className={tool.color}>{tool.icon}</div>
                {tool.pro && (
                  <span className="px-2 py-0.5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[10px] font-bold">
                    PRO
                  </span>
                )}
              </div>
              <div>
                <p className="font-semibold">{tool.title}</p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {tool.desc}
                </p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div>
          <button
            onClick={() => setActiveTool(null)}
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] mb-4"
          >
            ← All Tools
          </button>

          {activeTool === "pull-rate" && <PullRateCalculator />}
          {activeTool === "set-tracker" && (
            <SetCompletionTracker ownedItems={[]} />
          )}
          {activeTool === "sealed-roi" && (
            <UpgradeGate feature="sealedVsOpenROI" mode="overlay">
              <SealedVsOpenROI />
            </UpgradeGate>
          )}
          {activeTool === "qr-labels" && (
            <UpgradeGate feature="qrLabels" mode="overlay">
              <QRCodeLabel items={[]} />
            </UpgradeGate>
          )}
        </div>
      )}
    </div>
  );
}
