"use client";

import { FileText, Download, Lock, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import { useTier } from "@/hooks/useTier";
import Button from "@/components/ui/Button";
import UpgradeGate from "@/components/tier/UpgradeGate";

export default function InsurancePage() {
  const { isPaid } = useTier();

  return (
    <div className="lg:max-w-3xl lg:mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-[var(--color-accent)]" />
          Insurance Reports
        </h1>
        <p className="text-[var(--color-text-muted)] mt-1">
          Generate documentation for your collection to support insurance claims
        </p>
      </div>

      {!isPaid ? (
        <>
          {/* Features Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-5 space-y-3">
              <div className="text-blue-400">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Detailed Valuations</p>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  Complete itemized list with current market values
                </p>
              </div>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="text-emerald-400">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Professional PDFs</p>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  High-quality PDF documents for insurance companies
                </p>
              </div>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="text-orange-400">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Historical Records</p>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  Track acquisition dates and purchase prices
                </p>
              </div>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="text-purple-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Portfolio Summaries</p>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  Category breakdowns and collection highlights
                </p>
              </div>
            </Card>
          </div>

          {/* Upgrade CTA */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[var(--color-accent)]/15 via-[var(--color-accent)]/5 to-[var(--color-success)]/10 border border-[var(--color-accent)]/20 space-y-4">
            <div>
              <h3 className="font-bold text-sm">Pro Feature</h3>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                Insurance reports are available with a Pro subscription. Create professional documentation to protect your collection with insurance coverage.
              </p>
            </div>
            <Link href="/pricing">
              <Button className="w-full">
                <Sparkles className="w-4 h-4" />
                Upgrade to Pro
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </>
      ) : (
        <>
          {/* Pro Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-5 space-y-3">
              <div className="text-blue-400">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Detailed Valuations</p>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  Complete itemized list with current market values
                </p>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">Coming soon</p>
            </Card>

            <Card className="p-5 space-y-3">
              <div className="text-emerald-400">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Professional PDFs</p>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  High-quality PDF documents for insurance companies
                </p>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">Coming soon</p>
            </Card>
          </div>

          {/* Info */}
          <div className="p-5 rounded-2xl bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20 space-y-3">
            <p className="font-semibold text-sm">What We're Building</p>
            <ul className="text-sm text-[var(--color-text-muted)] space-y-2">
              <li>• One-click PDF generation of your entire collection</li>
              <li>• Itemized valuations with photo references</li>
              <li>• Historical acquisition and pricing data</li>
              <li>• Professional formatting for insurance agencies</li>
              <li>• Updates as market values change</li>
            </ul>
          </div>
        </>
      )}

      {/* Related Pages */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Related Pages</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href="/collection">
            <div className="p-4 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent)] transition-colors">
              <p className="font-semibold text-sm">Collections</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Your portfolio
              </p>
            </div>
          </Link>
          <Link href="/market">
            <div className="p-4 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent)] transition-colors">
              <p className="font-semibold text-sm">Market Trends</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Price movements
              </p>
            </div>
          </Link>
          <Link href="/pricing">
            <div className="p-4 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent)] transition-colors">
              <p className="font-semibold text-sm">Pro Plans</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Upgrade now
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
