import Link from "next/link";
import { Layers, MapPin, Route, TrendingUp, Scan, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
        <span className="text-xl font-bold tracking-tight">STAKD</span>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="text-sm px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded-lg transition-colors font-medium"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight">
            The Operating System
            <br />
            <span className="text-[var(--color-accent)]">for Collectors</span>
          </h1>
          <p className="text-lg text-[var(--color-text-muted)] max-w-xl mx-auto">
            Track your collection. Find local restocks. Optimize your routes.
            Know what your pieces are worth — in real time.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] rounded-lg transition-colors font-medium"
            >
              Start Collecting <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-20 max-w-2xl w-full">
          {[
            { icon: Layers, label: "Collection Mgmt" },
            { icon: TrendingUp, label: "Live Valuations" },
            { icon: MapPin, label: "Restock Tracker" },
            { icon: Route, label: "Route Optimizer" },
            { icon: Scan, label: "Barcode Scan" },
            { icon: ArrowRight, label: "Trade Matching" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)]"
            >
              <Icon className="w-6 h-6 text-[var(--color-accent)]" />
              <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-[var(--color-border)] text-center text-xs text-[var(--color-text-muted)]">
        &copy; {new Date().getFullYear()} STAKD. Built for collectors.
      </footer>
    </div>
  );
}
