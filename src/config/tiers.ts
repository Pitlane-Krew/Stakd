/**
 * STAKD Subscription Tiers
 *
 * Free tier is generous to drive adoption. Premium unlocks power-user
 * features that cost us money to run (AI, real-time data, analytics).
 */

export type TierLevel = "free" | "pro" | "elite";

export interface TierDefinition {
  id: TierLevel;
  name: string;
  tagline: string;
  price: number; // monthly USD, 0 = free
  annualPrice: number; // annual USD, 0 = free
  color: string;
  features: TierFeature[];
  limits: TierLimits;
}

export interface TierFeature {
  key: string;
  label: string;
  included: boolean;
  tooltip?: string;
}

export interface TierLimits {
  maxCollections: number; // -1 = unlimited
  maxItemsPerCollection: number;
  maxImages: number;
  priceAlerts: number;
  aiGradesPerMonth: number;
  insuranceReports: boolean;
  marketMomentum: boolean;
  pullRateCalculator: boolean;
  sealedVsOpenROI: boolean;
  setCompletionTracker: boolean;
  qrLabels: boolean;
  publicShowcase: boolean;
  socialShare: boolean;
  multiPlatformListing: boolean;
  advancedAnalytics: boolean;
  prioritySupport: boolean;
}

// ---------------------------------------------------------------------------
// Feature gate keys (used throughout the app to check access)
// ---------------------------------------------------------------------------
export type GatedFeature = keyof Omit<TierLimits, "maxCollections" | "maxItemsPerCollection" | "maxImages" | "priceAlerts" | "aiGradesPerMonth">;

// ---------------------------------------------------------------------------
// Tier definitions
// ---------------------------------------------------------------------------
export const TIERS: Record<TierLevel, TierDefinition> = {
  free: {
    id: "free",
    name: "Starter",
    tagline: "Everything you need to start tracking",
    price: 0,
    annualPrice: 0,
    color: "#6b7280",
    limits: {
      maxCollections: 5,
      maxItemsPerCollection: 50,
      maxImages: 2,
      priceAlerts: 3,
      aiGradesPerMonth: 5,
      insuranceReports: false,
      marketMomentum: false,
      pullRateCalculator: true,
      sealedVsOpenROI: false,
      setCompletionTracker: true,
      qrLabels: false,
      publicShowcase: true,
      socialShare: true,
      multiPlatformListing: true,
      advancedAnalytics: false,
      prioritySupport: false,
    },
    features: [
      { key: "collections", label: "Up to 5 collections", included: true },
      { key: "items", label: "50 items per collection", included: true },
      { key: "pricing", label: "Real-time market values", included: true },
      { key: "showcase", label: "Public showcase page", included: true },
      { key: "social", label: "Community feed & friends", included: true },
      { key: "listing", label: "Multi-platform listing", included: true },
      { key: "pullRate", label: "Pull rate calculator", included: true },
      { key: "setTracker", label: "Set completion tracker", included: true },
      { key: "aiGrade", label: "5 AI grades / month", included: true },
      { key: "alerts", label: "3 price alerts", included: true },
      { key: "analytics", label: "Advanced analytics", included: false },
      { key: "insurance", label: "Insurance reports", included: false },
      { key: "momentum", label: "Market momentum", included: false },
      { key: "sealedROI", label: "Sealed vs Open ROI", included: false },
      { key: "qr", label: "QR code labels", included: false },
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "For serious collectors who want an edge",
    price: 7.99,
    annualPrice: 69.99,
    color: "#7c3aed",
    limits: {
      maxCollections: 25,
      maxItemsPerCollection: 500,
      maxImages: 4,
      priceAlerts: 25,
      aiGradesPerMonth: 50,
      insuranceReports: true,
      marketMomentum: true,
      pullRateCalculator: true,
      sealedVsOpenROI: true,
      setCompletionTracker: true,
      qrLabels: true,
      publicShowcase: true,
      socialShare: true,
      multiPlatformListing: true,
      advancedAnalytics: true,
      prioritySupport: false,
    },
    features: [
      { key: "collections", label: "Up to 25 collections", included: true },
      { key: "items", label: "500 items per collection", included: true },
      { key: "allFree", label: "Everything in Starter", included: true },
      { key: "analytics", label: "Advanced analytics & ROI", included: true },
      { key: "insurance", label: "Insurance reports", included: true },
      { key: "momentum", label: "Market momentum indicators", included: true },
      { key: "sealedROI", label: "Sealed vs Open ROI tool", included: true },
      { key: "qr", label: "QR code labels", included: true },
      { key: "alerts", label: "25 price alerts", included: true },
      { key: "aiGrade", label: "50 AI grades / month", included: true },
      { key: "priority", label: "Priority support", included: false },
      { key: "unlimited", label: "Unlimited everything", included: false },
    ],
  },
  elite: {
    id: "elite",
    name: "Elite",
    tagline: "Unlimited power for top-tier collectors",
    price: 14.99,
    annualPrice: 129.99,
    color: "#f59e0b",
    limits: {
      maxCollections: -1,
      maxItemsPerCollection: -1,
      maxImages: 8,
      priceAlerts: -1,
      aiGradesPerMonth: -1,
      insuranceReports: true,
      marketMomentum: true,
      pullRateCalculator: true,
      sealedVsOpenROI: true,
      setCompletionTracker: true,
      qrLabels: true,
      publicShowcase: true,
      socialShare: true,
      multiPlatformListing: true,
      advancedAnalytics: true,
      prioritySupport: true,
    },
    features: [
      { key: "unlimited", label: "Unlimited collections & items", included: true },
      { key: "allPro", label: "Everything in Pro", included: true },
      { key: "alerts", label: "Unlimited price alerts", included: true },
      { key: "aiGrade", label: "Unlimited AI grades", included: true },
      { key: "images", label: "Up to 8 images per item", included: true },
      { key: "priority", label: "Priority support", included: true },
      { key: "earlyAccess", label: "Early access to new features", included: true },
      { key: "badge", label: "Elite collector badge", included: true },
    ],
  },
};

// ---------------------------------------------------------------------------
// Helper: Check if a feature is available for a given tier
// ---------------------------------------------------------------------------
export function hasFeature(tier: TierLevel, feature: GatedFeature): boolean {
  return TIERS[tier].limits[feature];
}

export function getLimit(tier: TierLevel, key: "maxCollections" | "maxItemsPerCollection" | "maxImages" | "priceAlerts" | "aiGradesPerMonth"): number {
  return TIERS[tier].limits[key];
}

export function isWithinLimit(tier: TierLevel, key: "maxCollections" | "maxItemsPerCollection" | "maxImages" | "priceAlerts" | "aiGradesPerMonth", currentCount: number): boolean {
  const limit = getLimit(tier, key);
  return limit === -1 || currentCount < limit;
}
