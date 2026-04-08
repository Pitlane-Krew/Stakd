"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, X, Sparkles, Crown, Zap, Loader2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { TIERS, type TierLevel } from "@/config/tiers";
import { useTier } from "@/hooks/useTier";

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-text-muted)]" />
        </div>
      }
    >
      <PricingContent />
    </Suspense>
  );
}

function PricingContent() {
  const [annual, setAnnual] = useState(true);
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tier: currentTier } = useTier();

  const showSuccess = searchParams.get("success") === "true";
  const showCancelled = searchParams.get("cancelled") === "true";

  const tierOrder: TierLevel[] = ["free", "pro", "elite"];
  const icons: Record<TierLevel, React.ReactNode> = {
    free: <Zap className="w-6 h-6" />,
    pro: <Sparkles className="w-6 h-6" />,
    elite: <Crown className="w-6 h-6" />,
  };

  const handleUpgrade = async (tierId: TierLevel) => {
    if (tierId === "free") return;

    try {
      setLoading(tierId);
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: tierId, annual }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start checkout");
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert(error instanceof Error ? error.message : "Failed to start checkout");
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setLoading("portal");
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to open subscription portal");
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Portal error:", error);
      alert(error instanceof Error ? error.message : "Failed to open subscription portal");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="lg:max-w-5xl lg:mx-auto py-6 lg:py-10 space-y-8 lg:space-y-10">
      {/* Success/Error alerts */}
      {showSuccess && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm">
          Payment successful! Your subscription is now active.
        </div>
      )}
      {showCancelled && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-sm">
          Checkout cancelled. Your plan has not been changed.
        </div>
      )}

      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold">Choose Your Plan</h1>
        <p className="text-[var(--color-text-muted)] lg:max-w-lg lg:mx-auto">
          Start free, upgrade when you need more. Every plan includes core
          collection tracking and community features.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-3 mt-4 p-1 rounded-full bg-[var(--color-bg-elevated)]">
          <button
            onClick={() => setAnnual(false)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              !annual
                ? "bg-[var(--color-bg-card)] text-[var(--color-text)] shadow-sm"
                : "text-[var(--color-text-muted)]"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              annual
                ? "bg-[var(--color-bg-card)] text-[var(--color-text)] shadow-sm"
                : "text-[var(--color-text-muted)]"
            }`}
          >
            Annual
            <span className="ml-1.5 text-xs text-emerald-400 font-semibold">
              Save 28%
            </span>
          </button>
        </div>
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tierOrder.map((id) => {
          const t = TIERS[id];
          const isCurrent = id === currentTier;
          const isPopular = id === "pro";
          const price = annual ? t.annualPrice : t.price;
          const perMonth = annual && t.annualPrice > 0
            ? (t.annualPrice / 12).toFixed(2)
            : t.price.toFixed(2);

          return (
            <Card
              key={id}
              className={`relative p-6 flex flex-col transition-all ${
                isPopular
                  ? "border-[var(--color-accent)] shadow-lg shadow-[var(--color-accent)]/10 scale-[1.02]"
                  : ""
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[var(--color-accent)] text-white text-xs font-bold">
                  Most Popular
                </div>
              )}

              {/* Icon + name */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${t.color}20`, color: t.color }}
                >
                  {icons[id]}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{t.name}</h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {t.tagline}
                  </p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-6">
                {price === 0 ? (
                  <p className="text-3xl font-bold">Free</p>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">
                        ${perMonth}
                      </span>
                      <span className="text-sm text-[var(--color-text-muted)]">
                        /mo
                      </span>
                    </div>
                    {annual && (
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        ${t.annualPrice}/year · billed annually
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2.5 flex-1 mb-6">
                {t.features.map((f) => (
                  <li key={f.key} className="flex items-start gap-2 text-sm">
                    {f.included ? (
                      <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-[var(--color-text-muted)]/40 mt-0.5 flex-shrink-0" />
                    )}
                    <span
                      className={
                        f.included
                          ? "text-[var(--color-text)]"
                          : "text-[var(--color-text-muted)]/60"
                      }
                    >
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrent ? (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleManageSubscription}
                  disabled={loading === "portal"}
                >
                  {loading === "portal" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                    </>
                  ) : (
                    "Manage Subscription"
                  )}
                </Button>
              ) : id === "free" ? (
                <Button variant="secondary" className="w-full">
                  Get Started
                </Button>
              ) : (
                <Button
                  className="w-full"
                  style={
                    isPopular
                      ? {}
                      : { backgroundColor: t.color }
                  }
                  onClick={() => handleUpgrade(id)}
                  disabled={loading === id}
                >
                  {loading === id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Upgrade to {t.name}
                    </>
                  )}
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {/* FAQ / trust */}
      <div className="text-center space-y-2 pb-8">
        <p className="text-sm text-[var(--color-text-muted)]">
          Cancel anytime · No hidden fees · 7-day money-back guarantee
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          Payments processed securely via Stripe. Your card details never touch
          our servers.
        </p>
      </div>
    </div>
  );
}
