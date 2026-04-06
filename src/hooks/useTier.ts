"use client";

import { useMemo } from "react";
import { useAuth } from "./useAuth";
import {
  type TierLevel,
  type GatedFeature,
  TIERS,
  hasFeature,
  getLimit,
  isWithinLimit,
} from "@/config/tiers";

/**
 * Hook that exposes the current user's subscription tier and gate-checking
 * helpers.
 *
 * BETA MODE: When NEXT_PUBLIC_BETA_MODE=true, every user gets Elite-level
 * access — all features unlocked, all limits removed.
 * Stripe integration will be added at full launch; remove the beta flag then.
 */

const BETA_MODE = process.env.NEXT_PUBLIC_BETA_MODE === "true";

export function useTier() {
  const { profile } = useAuth();

  const tier: TierLevel = useMemo(() => {
    // In beta, everyone is Elite
    if (BETA_MODE) return "elite";
    const raw = (profile as Record<string, unknown> | null)?.tier;
    if (raw === "pro" || raw === "elite") return raw;
    return "free";
  }, [profile]);

  const tierDef = TIERS[tier];

  return {
    /** Current tier level */
    tier,
    /** Full tier definition (name, limits, features) */
    tierDef,
    /** In beta mode: always true */
    can: (feature: GatedFeature) => BETA_MODE || hasFeature(tier, feature),
    /** In beta mode: always -1 (unlimited) */
    limit: (key: Parameters<typeof getLimit>[1]) =>
      BETA_MODE ? -1 : getLimit(tier, key),
    /** In beta mode: always true */
    withinLimit: (key: Parameters<typeof isWithinLimit>[1], count: number) =>
      BETA_MODE || isWithinLimit(tier, key, count),
    /** Whether user is on a paid plan (always false in beta — no payments yet) */
    isPaid: BETA_MODE ? false : tier !== "free",
    /** Whether user is on elite */
    isElite: BETA_MODE || tier === "elite",
    /** Beta mode flag — use to hide pricing UI in beta */
    isBeta: BETA_MODE,
  };
}
