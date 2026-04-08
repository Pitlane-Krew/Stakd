"use client";

import { Search, ArrowRight } from "lucide-react";
import Link from "next/link";
import SavedSearches from "@/components/collection/SavedSearches";
import Button from "@/components/ui/Button";

export default function SavedSearchesPage() {
  return (
    <div className="lg:max-w-2xl lg:mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Search className="w-6 h-6 text-[var(--color-accent)]" />
          Saved Searches
        </h1>
        <p className="text-[var(--color-text-muted)] mt-1">
          Save search queries and get notified when new items matching your interests appear in the marketplace
        </p>
      </div>

      {/* SavedSearches Component */}
      <SavedSearches />

      {/* Tips */}
      <div className="p-5 rounded-2xl bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20 space-y-3">
        <p className="font-semibold text-sm">How to Use Saved Searches</p>
        <ul className="text-sm text-[var(--color-text-muted)] space-y-2">
          <li>• Save specific grading criteria like "PSA 10" or "PSA 9"</li>
          <li>• Set up searches for rare variants and chase cards</li>
          <li>• Monitor price drops on sealed products and boxes</li>
          <li>• Track new releases and limited edition items</li>
          <li>• Enable notifications to get alerts instantly</li>
        </ul>
      </div>

      {/* Related Features */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Related Features</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link href="/watchlist">
            <div className="p-4 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent)] transition-colors">
              <p className="font-semibold text-sm">Watchlist</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Track specific items you want
              </p>
            </div>
          </Link>
          <Link href="/tools">
            <div className="p-4 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-accent)] transition-colors">
              <p className="font-semibold text-sm">Collector Tools</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Market analysis & calculators
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
