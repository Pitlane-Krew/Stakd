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
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  Shield,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";

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
  // Hide pricing/upgrade nav item in beta — free for everyone
  { href: "/pricing", label: "Upgrade", icon: Sparkles, betaHide: true },
];

export default function Navbar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const { resolved, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isDark = resolved === "dark";
  const visibleItems = navItems.filter((item) => !(BETA_MODE && item.betaHide));

  return (
    <>
      {/* Desktop sidebar */}
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
        </nav>

        {/* Profile section */}
        <div className="p-3 border-t border-[var(--color-border)]">
          {profile ? (
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

      {/* Mobile top bar */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-card)] sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="text-lg font-bold text-[var(--color-accent)]">
            STAKD
          </Link>
          {BETA_MODE && (
            <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full uppercase">
              Beta
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="p-2 rounded-lg hover:bg-[var(--color-bg-hover)]"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-[var(--color-text-muted)]" />
            )}
          </button>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-[var(--color-bg)] pt-14">
          <nav className="p-4 space-y-1">
            {visibleItems.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base transition-colors ${
                    active
                      ? "bg-[var(--color-accent)] text-white"
                      : "text-[var(--color-text-muted)]"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile profile */}
          {profile && (
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[var(--color-border)] bg-[var(--color-bg-card)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-sm font-bold text-white">
                  {profile.display_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{profile.display_name}</p>
                </div>
                <button
                  onClick={signOut}
                  className="text-sm text-[var(--color-danger)]"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
