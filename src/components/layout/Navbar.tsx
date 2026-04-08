"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  MapPin,
  Route,
  Users,
  Scan,
  ArrowLeftRight,
  Sparkles,
  Wrench,
  Sun,
  Moon,
  LogOut,
  Shield,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useAdmin } from "@/hooks/useAdmin";

const BETA_MODE = process.env.NEXT_PUBLIC_BETA_MODE === "true";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, betaHide: false },
  { href: "/collection", label: "Collection", icon: Layers, betaHide: false },
  { href: "/feed", label: "Community", icon: Users, betaHide: false },
  { href: "/trades", label: "Trades", icon: ArrowLeftRight, betaHide: false },
  { href: "/restock", label: "Restocks", icon: MapPin, betaHide: false },
  { href: "/routes/plan", label: "Routes", icon: Route, betaHide: false },
  { href: "/scan", label: "Scan", icon: Scan, betaHide: false },
  { href: "/grading", label: "AI Grade", icon: Sparkles, betaHide: false },
  { href: "/tools", label: "Tools", icon: Wrench, betaHide: false },
  { href: "/pricing", label: "Upgrade", icon: Sparkles, betaHide: true },
];

/**
 * Desktop-only sidebar navigation.
 * Mobile navigation is handled by MobileHeader + MobileTabBar.
 */
export default function Navbar() {
  const pathname = usePathname();
  const { profile, loading, signOut } = useAuth();
  const { resolved, setTheme } = useTheme();
  const { isAdmin, loading: adminLoading } = useAdmin();

  const isDark = resolved === "dark";
  const visibleItems = navItems.filter((item) => !(BETA_MODE && item.betaHide));

  return (
    <aside className="hidden lg:flex flex-col w-60 border-r border-[var(--color-border)] bg-[var(--color-bg-card)] h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <Link href="/dashboard" className="text-xl font-bold tracking-tight text-[var(--color-accent)]">
          STAKD
        </Link>
        <div className="flex items-center gap-1">
          {BETA_MODE && (
            <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
              Beta
            </span>
          )}
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="p-2 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-[var(--color-text-muted)]" />
            )}
          </button>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                active
                  ? "bg-[var(--color-accent)] text-white shadow-sm"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]"
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              {label}
            </Link>
          );
        })}

        {/* Admin panel link — only visible to admins */}
        {!adminLoading && isAdmin && (
          <Link
            href="/admin"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all mt-2 border-t border-[var(--color-border)] pt-3 ${
              pathname.startsWith("/admin")
                ? "bg-orange-500 text-white shadow-sm"
                : "text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
            }`}
          >
            <Shield className="w-[18px] h-[18px]" />
            Admin Panel
          </Link>
        )}
      </nav>

      {/* Profile section */}
      <div className="p-3 border-t border-[var(--color-border)]">
        {loading ? (
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-r from-[var(--color-bg-hover)] to-[var(--color-bg-card)] animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-24 rounded bg-gradient-to-r from-[var(--color-bg-hover)] to-[var(--color-bg-card)] animate-pulse" />
              <div className="h-3 w-16 rounded bg-gradient-to-r from-[var(--color-bg-hover)] to-[var(--color-bg-card)] animate-pulse" />
            </div>
          </div>
        ) : profile ? (
          <div className="flex items-center gap-3 px-2 py-2">
            <Link
              href="/profile"
              className="flex items-center gap-3 flex-1 min-w-0 group"
            >
              <div className="w-9 h-9 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                {profile.display_name?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate group-hover:text-[var(--color-accent)] transition-colors">
                  {profile.display_name || "Profile"}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] truncate">
                  View profile
                </p>
              </div>
            </Link>
            <button
              onClick={signOut}
              className="p-2 rounded-lg hover:bg-[var(--color-danger-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="block text-center px-4 py-2.5 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </aside>
  );
}
