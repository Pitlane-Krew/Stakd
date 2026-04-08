"use client";

import { Eye, ArrowRight } from "lucide-react";
import Link from "next/link";
import Watchlist from "@/components/collection/Watchlist";
import Button from "@/components/ui/Button";

export default function WatchlistPage() {
  return (
    <div className="lg:max-w-2xl lg:mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Eye className="w-6 h-6 text-[var(--color-accent)]" />
          Your Watchlist
        </h1>
        <p className="text-[var(--color-text-muted)] mt-1">
          Track items you want to own and monitor their prices without adding them to your collection
        </p>
      </div>

      {/* Watchlist Component */}
      <Watchlist />

      {/* Tips */}
      <div className="p-5 rounded-2xl bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20 space-y-3">
        <p className="font-semibold text-sm">Pro Tips</p>
        <ul className="text-sm text-[var(--color-text-muted)] space-y-2">
          <li>• Set target prices to get alerts when items drop below your desired price</li>
          <li>• Use the watchlist to research pricing trends before making a purchase</li>
          <li>• Track local market movement for items in your collecting niches</li>
          <li>• Keep items on your watchlist for 3-6 months to identify seasonal trends</li>
        </ul>
      </div>

      {/* Related Features */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Related Features</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link href="/saved-searches">
            <div className="p-4 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent)] transition-colors">
              <p className="font-semibold text-sm">Saved Searches</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Get notified when matches appear
              </p>
            </div>
          </Link>
          <Link href="/collection">
            <div className="p-4 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent)] transition-colors">
              <p className="font-semibold text-sm">My Collections</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                View items you own
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
