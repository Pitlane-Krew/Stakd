"use client";

import { useState, useEffect } from "react";
import { CreditCard, ChevronRight, AlertCircle, CheckCircle, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { TIERS } from "@/config/tiers";
import { formatCurrency } from "@/lib/utils";
import type { Database } from "@/types/database";

interface Subscription {
  id: string;
  status: "active" | "past_due" | "cancelled" | "unpaid";
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  plan_id?: string;
  plan_name?: string;
  plan_amount?: number;
}

interface UsageData {
  collections: number;
  items: number;
  aiGradesUsed: number;
  priceAlerts: number;
}

export default function BillingPage() {
  const { user, profile } = useAuth();
  const { tier, tierDef, limit, isBeta } = useTier();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageData>({
    collections: 0,
    items: 0,
    aiGradesUsed: 0,
    priceAlerts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!user?.id) return;
    loadBillingData();
  }, [user?.id]);

  async function loadBillingData() {
    setLoading(true);
    try {
      // Load subscription data (may not exist if no subscription yet)
      try {
        const { data: subData } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user?.id)
          .single();

        if (subData) {
          setSubscription(subData as Subscription);
        }
      } catch (err) {
        // Subscriptions table may not exist or user has no subscription yet
        console.log("No subscription data available");
      }

      // Load usage data
      try {
        const [collectionsRes, itemsRes, gradesRes, alertsRes] = await Promise.all([
          supabase
            .from("collections")
            .select("id", { count: "exact" })
            .eq("user_id", user?.id),
          supabase
            .from("items")
            .select("id", { count: "exact" })
            .eq("user_id", user?.id),
          supabase
            .from("profiles")
            .select("ai_grades_used_this_month")
            .eq("id", user?.id)
            .single(),
          supabase
            .from("price_alerts")
            .select("id", { count: "exact" })
            .eq("user_id", user?.id),
        ]);

        setUsage({
          collections: collectionsRes.count ?? 0,
          items: itemsRes.count ?? 0,
          aiGradesUsed: (gradesRes.data?.ai_grades_used_this_month ?? 0),
          priceAlerts: alertsRes.count ?? 0,
        });
      } catch (err) {
        console.error("Error loading usage data:", err);
      }
    } catch (err) {
      console.error("Error loading billing data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function openBillingPortal() {
    setPortalLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Error opening billing portal:", err);
    } finally {
      setPortalLoading(false);
    }
  }

  const maxCollections = limit("maxCollections");
  const maxItems = limit("maxItemsPerCollection");
  const maxGrades = limit("aiGradesPerMonth");
  const maxAlerts = limit("priceAlerts");

  const collectionsPercent =
    maxCollections === -1 ? 0 : (usage.collections / maxCollections) * 100;
  const gradesPercent =
    maxGrades === -1 ? 0 : (usage.aiGradesUsed / maxGrades) * 100;
  const alertsPercent =
    maxAlerts === -1 ? 0 : (usage.priceAlerts / maxAlerts) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-[var(--color-accent)]" />
          Billing & Subscription
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Manage your subscription and billing settings
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-[var(--color-bg-elevated)] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current Plan */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text)]">
                  Current Plan
                </h2>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  {isBeta
                    ? "Beta access - All features unlocked"
                    : `You're on the ${tierDef.name} plan`}
                </p>
              </div>
              <div
                className="px-3 py-1.5 rounded-lg font-semibold text-sm"
                style={{
                  backgroundColor: `${tierDef.color}20`,
                  color: tierDef.color,
                }}
              >
                {tierDef.name}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-3 rounded-lg bg-[var(--color-bg-elevated)]">
                <p className="text-xs text-[var(--color-text-muted)] mb-1">Price</p>
                <p className="text-lg font-bold text-[var(--color-text)]">
                  {tierDef.price === 0 ? "Free" : `$${tierDef.price}`}
                  {tierDef.price > 0 && (
                    <span className="text-xs text-[var(--color-text-muted)] ml-1">
                      /mo
                    </span>
                  )}
                </p>
              </div>

              {subscription && (
                <>
                  <div className="p-3 rounded-lg bg-[var(--color-bg-elevated)]">
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">
                      Status
                    </p>
                    <div className="flex items-center gap-1">
                      {subscription.status === "active" ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                          <p className="text-sm font-medium text-[var(--color-success)]">
                            Active
                          </p>
                        </>
                      ) : subscription.status === "past_due" ? (
                        <>
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                          <p className="text-sm font-medium text-amber-400">
                            Past Due
                          </p>
                        </>
                      ) : (
                        <p className="text-sm font-medium text-[var(--color-text-muted)]">
                          {subscription.status}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[var(--color-bg-elevated)]">
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">
                      Billing Cycle
                    </p>
                    <p className="text-xs font-medium text-[var(--color-text)]">
                      {new Date(subscription.current_period_start).toLocaleDateString()} -{" "}
                      {new Date(subscription.current_period_end).toLocaleDateString()}
                    </p>
                  </div>

                  {subscription.cancel_at_period_end && (
                    <div className="p-3 rounded-lg bg-[var(--color-danger-subtle)] border border-[var(--color-danger)]">
                      <p className="text-xs text-[var(--color-danger)] font-medium">
                        Cancelling soon
                      </p>
                      <p className="text-xs text-[var(--color-danger)] mt-1">
                        Ends {new Date(subscription.current_period_end).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-3">
              <Button onClick={() => window.location.href = "/pricing"}>
                <TrendingUp className="w-4 h-4" /> Change Plan
              </Button>
              {subscription && (
                <Button
                  variant="secondary"
                  onClick={openBillingPortal}
                  loading={portalLoading}
                >
                  Manage Subscription
                </Button>
              )}
            </div>
          </Card>

          {/* Usage Stats */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
              Usage & Limits
            </h2>

            <div className="space-y-4">
              {/* Collections */}
              <UsageBar
                label="Collections"
                current={usage.collections}
                max={maxCollections}
                description={`${usage.collections} of ${maxCollections === -1 ? "unlimited" : maxCollections}`}
                percent={collectionsPercent}
              />

              {/* AI Grades */}
              <UsageBar
                label="AI Grades"
                current={usage.aiGradesUsed}
                max={maxGrades}
                description={`${usage.aiGradesUsed} of ${maxGrades === -1 ? "unlimited" : maxGrades} this month`}
                percent={gradesPercent}
              />

              {/* Price Alerts */}
              <UsageBar
                label="Price Alerts"
                current={usage.priceAlerts}
                max={maxAlerts}
                description={`${usage.priceAlerts} of ${maxAlerts === -1 ? "unlimited" : maxAlerts}`}
                percent={alertsPercent}
              />
            </div>
          </Card>

          {/* Plan Features */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
              Plan Features
            </h2>

            <div className="grid md:grid-cols-2 gap-3">
              {tierDef.features.map((feature) => (
                <div
                  key={feature.key}
                  className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-bg-elevated)]"
                >
                  {feature.included ? (
                    <CheckCircle className="w-4 h-4 text-[var(--color-success)] flex-shrink-0 mt-0.5" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-[var(--color-border)] rounded-full flex-shrink-0 mt-0.5" />
                  )}
                  <p
                    className={`text-sm ${
                      feature.included
                        ? "text-[var(--color-text)]"
                        : "text-[var(--color-text-muted)]"
                    }`}
                  >
                    {feature.label}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Compare Tiers */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-4">
              Compare Plans
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-3 px-3 font-medium text-[var(--color-text)]">
                      Feature
                    </th>
                    {Object.values(TIERS).map((t) => (
                      <th
                        key={t.id}
                        className="text-center py-3 px-3 font-medium text-[var(--color-text)]"
                      >
                        {t.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[var(--color-border-subtle)]">
                    <td className="py-3 px-3 text-[var(--color-text)]">Price</td>
                    {Object.values(TIERS).map((t) => (
                      <td key={t.id} className="text-center py-3 px-3">
                        <span className="font-semibold">
                          {t.price === 0 ? "Free" : `$${t.price}/mo`}
                        </span>
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b border-[var(--color-border-subtle)]">
                    <td className="py-3 px-3 text-[var(--color-text)]">Collections</td>
                    {Object.values(TIERS).map((t) => (
                      <td key={t.id} className="text-center py-3 px-3">
                        {t.limits.maxCollections === -1
                          ? "Unlimited"
                          : t.limits.maxCollections}
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b border-[var(--color-border-subtle)]">
                    <td className="py-3 px-3 text-[var(--color-text)]">
                      AI Grades/month
                    </td>
                    {Object.values(TIERS).map((t) => (
                      <td key={t.id} className="text-center py-3 px-3">
                        {t.limits.aiGradesPerMonth === -1
                          ? "Unlimited"
                          : t.limits.aiGradesPerMonth}
                      </td>
                    ))}
                  </tr>

                  <tr className="border-b border-[var(--color-border-subtle)]">
                    <td className="py-3 px-3 text-[var(--color-text)]">Price Alerts</td>
                    {Object.values(TIERS).map((t) => (
                      <td key={t.id} className="text-center py-3 px-3">
                        {t.limits.priceAlerts === -1
                          ? "Unlimited"
                          : t.limits.priceAlerts}
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td className="py-3 px-3 text-[var(--color-text)]">
                      Advanced Analytics
                    </td>
                    {Object.values(TIERS).map((t) => (
                      <td key={t.id} className="text-center py-3 px-3">
                        {t.limits.advancedAnalytics ? (
                          <CheckCircle className="w-4 h-4 text-[var(--color-success)] mx-auto" />
                        ) : (
                          <div className="w-4 h-4 border-2 border-[var(--color-border)] rounded-full mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* Danger Zone */}
          {subscription && (
            <Card className="p-6 border-[var(--color-danger)]">
              <h2 className="text-lg font-semibold text-[var(--color-text)] mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[var(--color-danger)]" />
                Danger Zone
              </h2>
              <p className="text-sm text-[var(--color-text-muted)] mb-4">
                These actions may affect your account and data
              </p>

              <Button
                variant="danger"
                onClick={openBillingPortal}
                disabled={portalLoading}
              >
                Cancel Subscription
              </Button>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

interface UsageBarProps {
  label: string;
  current: number;
  max: number;
  description: string;
  percent: number;
}

function UsageBar({ label, current, max, description, percent }: UsageBarProps) {
  const isNearLimit = percent > 80 && percent < 100;
  const isAtLimit = percent >= 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-[var(--color-text)]">{label}</p>
        <p className="text-xs text-[var(--color-text-muted)]">{description}</p>
      </div>
      <div className="h-2 rounded-full bg-[var(--color-bg-elevated)] overflow-hidden">
        <div
          className={`h-full transition-all ${
            isAtLimit
              ? "bg-[var(--color-danger)]"
              : isNearLimit
              ? "bg-amber-400"
              : "bg-[var(--color-success)]"
          }`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}
