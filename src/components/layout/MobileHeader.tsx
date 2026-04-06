"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sun,
  Moon,
  Bell,
  Search,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const BETA_MODE = process.env.NEXT_PUBLIC_BETA_MODE === "true";

function getPageTitle(pathname: string): string {
  if (pathname === "/dashboard") return "Home";
  if (pathname === "/collection") return "Collection";
  if (pathname.startsWith("/collection/")) return "Collection";
  if (pathname === "/feed") return "Community";
  if (pathname === "/profile") return "Profile";
  if (pathname === "/trades") return "Trades";
  if (pathname === "/restock") return "Restocks";
  if (pathname === "/routes/plan") return "Route Planner";
  if (pathname === "/scan") return "Scan";
  if (pathname === "/grading") return "AI Grade";
  if (pathname === "/tools") return "Tools";
  if (pathname === "/pricing") return "Pricing";
  if (pathname.startsWith("/u/")) return "Profile";
  return "STAKD";
}

export default function MobileHeader() {
  const pathname = usePathname();
  const { resolved, setTheme } = useTheme();
  const isDark = resolved === "dark";
  const pageTitle = getPageTitle(pathname);
  const isHome = pathname === "/dashboard";

  return (
    <header className="lg:hidden sticky top-0 z-40 bg-[var(--color-bg)]/95 backdrop-blur-xl border-b border-[var(--color-border)]/40">
      {/* Safe area spacer for notched devices */}
      <div className="pt-[env(safe-area-inset-top)]" />

      <div className="flex items-center justify-between px-4 h-12">
        {/* Left: Logo on home, page title elsewhere */}
        <div className="flex items-center gap-2 min-w-0">
          {isHome ? (
            <>
              <span className="text-xl font-extrabold tracking-tight text-[var(--color-accent)]">
                STAKD
              </span>
              {BETA_MODE && (
                <span className="text-[8px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                  Beta
                </span>
              )}
            </>
          ) : (
            <h1 className="text-lg font-bold truncate">{pageTitle}</h1>
          )}
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            className="p-2 rounded-xl active:scale-90 active:bg-[var(--color-bg-hover)] transition-transform"
            title="Search"
          >
            <Search className="w-[18px] h-[18px] text-[var(--color-text-muted)]" />
          </button>
          <button
            className="p-2 rounded-xl active:scale-90 active:bg-[var(--color-bg-hover)] transition-transform relative"
            title="Notifications"
          >
            <Bell className="w-[18px] h-[18px] text-[var(--color-text-muted)]" />
            <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--color-danger)] border border-[var(--color-bg)]" />
          </button>
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="p-2 rounded-xl active:scale-90 active:bg-[var(--color-bg-hover)] transition-transform"
            title={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? (
              <Sun className="w-[18px] h-[18px] text-amber-400" />
            ) : (
              <Moon className="w-[18px] h-[18px] text-[var(--color-text-muted)]" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
