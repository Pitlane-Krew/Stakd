"use client";

import { type ReactNode } from "react";
import { Lock, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTier } from "@/hooks/useTier";
import type { GatedFeature } from "@/config/tiers";

interface Props {
  /** The feature key to gate behind */
  feature: GatedFeature;
  /** Content shown when the feature IS unlocked */
  children: ReactNode;
  /** Optional custom locked message */
  lockedMessage?: string;
  /** "inline" = small badge, "overlay" = blurred overlay, "block" = full card */
  mode?: "inline" | "overlay" | "block";
}

/**
 * Wraps any component and shows an upgrade prompt when the user's tier
 * doesn't include the requested feature. Three display modes:
 *
 *   inline  – small lock icon + link (for buttons / small elements)
 *   overlay – blurred preview with CTA overlay (for cards / panels)
 *   block   – replaces content entirely with an upgrade card
 */
export default function UpgradeGate({
  feature,
  children,
  lockedMessage,
  mode = "overlay",
}: Props) {
  const { can, isBeta } = useTier();

  // Beta mode: never gate anything
  if (isBeta || can(feature)) {
    return <>{children}</>;
  }

  const message =
    lockedMessage ?? `Upgrade to Pro to unlock this feature`;

  // ── Inline mode ──
  if (mode === "inline") {
    return (
      <Link
        href="/pricing"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 transition-colors"
      >
        <Lock className="w-3 h-3" />
        Pro
      </Link>
    );
  }

  // ── Overlay mode ──
  if (mode === "overlay") {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none blur-[2px] opacity-50">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg)]/60 backdrop-blur-sm rounded-xl">
          <Link
            href="/pricing"
            className="flex flex-col items-center gap-3 p-6 text-center group"
          >
            <div className="w-12 h-12 rounded-full bg-[var(--color-accent)]/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-[var(--color-accent)]" />
            </div>
            <div>
              <p className="text-sm font-semibold">{message}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Starting at $7.99/mo
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-accent)] group-hover:gap-2 transition-all">
              View Plans <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
        </div>
      </div>
    );
  }

  // ── Block mode ──
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-8 text-center space-y-4">
      <div className="w-14 h-14 rounded-full bg-[var(--color-accent)]/10 flex items-center justify-center mx-auto">
        <Lock className="w-7 h-7 text-[var(--color-accent)]" />
      </div>
      <div>
        <h3 className="text-lg font-bold">{message}</h3>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Get access to advanced tools, unlimited tracking, and more.
        </p>
      </div>
      <Link
        href="/pricing"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-accent)] text-white text-sm font-semibold hover:bg-[var(--color-accent-hover)] transition-colors"
      >
        <Sparkles className="w-4 h-4" /> Upgrade Now
      </Link>
    </div>
  );
}
