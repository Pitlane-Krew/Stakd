"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calculator,
  Trophy,
  BarChart3,
  QrCode,
  Lock,
  Shield,
  Bell,
  Sparkles,
  Eye,
  Search,
  TrendingUp,
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
  href?: string;
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
    title: "Set Completion Tracker",
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
    color: "text-[var(--color-accent)]",
    title: "QR Code Labels",
    desc: "Generate scannable labels for your display",
    pro: true,
  },
];

const FEATURES: {
  icon: React.ReactNode;
  color: string;
  title: string;
  desc: string;
  href: string;
  pro?: boolean;
}[] = [
  {
    icon: <Eye className="w-6 h-6" />,
    color: "text-blue-400",
    title: "Watchlist",
    desc: "Track items you want without owning them",
    href: "/watchlist",
  },
  {
    icon: <Search className="w-6 h-6" />,
    color: "text-purple-400",
    title: "Saved Searches",
    desc: "Get notified when matches appear",
    href: "/saved-searches",
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    color: "text-green-400",
    title: "Market Momentum",
    desc: "Track trending items and price movements",
    href: "/market",
    pro: true,
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    color: "text-orange-400",
    title: "Insurance Reports",
    desc: "Generate insurance documentation for collections",
    href: "/insurance",
    pro: true,
  },
];

export default function ToolsPage() {
  const { isPaid } = useTier();
  const [activeTool, setActiveTool] = useState<Tool>(null);

  return (
    <div className="lg:max-w-4xl lg:mx-auto space-y-8">
      {/* Header */}
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
        <>
          {/* Calculators & Trackers */}
          <section>
            <h2 className="text-lg font-bold mb-4">Calculators & Trackers</h2>
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
          </section>

          {/* Collection Features */}
          <section>
            <h2 className="text-lg font-bold mb-4">Collection Features</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FEATURES.map((feature) => {
                const isLocked = feature.pro && !isPaid;
                return (
                  <Link key={feature.href} href={isLocked ? "/pricing" : feature.href}>
                    <Card className="p-5 hover:border-[var(--color-accent)] transition-colors space-y-3 h-full">
                      <div className="flex items-center justify-between">
                        <div className={feature.color}>{feature.icon}</div>
                        {feature.pro && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isLocked ? "bg-red-500/10 text-red-500" : "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"}`}>
                            {isLocked ? "LOCKED" : "PRO"}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">{feature.title}</p>
                        <p className="text-sm text-[var(--color-text-muted)]">
                          {feature.desc}
                        </p>
                      </div>
                      {isLocked && (
                        <div className="flex items-center gap-2 pt-2 text-xs text-[var(--color-accent)]">
                          <Lock className="w-3.5 h-3.5" />
                          Upgrade to unlock
                        </div>
                      )}
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      ) : (
        <div>
          <button
            onClick={() => setActiveTool(null)}
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] mb-4 flex items-center gap-1"
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
