"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  Scan,
  Users,
  User,
} from "lucide-react";

const tabs = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/collection", label: "Collection", icon: Layers },
  { href: "/scan", label: "Scan", icon: Scan, primary: true },
  { href: "/feed", label: "Community", icon: Users },
  { href: "/profile", label: "Profile", icon: User },
];

export default function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="mobile-tab-bar lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-border)]/40 bg-[var(--color-bg-card)]/95">
      <div className="flex items-center justify-around px-1 h-16 pb-[env(safe-area-inset-bottom)]">
        {tabs.map(({ href, label, icon: Icon, primary }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);

          if (primary) {
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center justify-center gap-0.5 -mt-3"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-150 ${
                    active
                      ? "bg-[var(--color-success)] scale-105"
                      : "bg-[var(--color-success)] active:scale-90"
                  }`}
                  style={{
                    boxShadow: "0 4px 12px rgba(0, 224, 113, 0.25)",
                  }}
                >
                  <Icon className="w-5 h-5 text-[#09090b]" strokeWidth={2.5} />
                </div>
                <span
                  className={`text-[10px] font-semibold leading-none ${
                    active
                      ? "text-[var(--color-success)]"
                      : "text-[var(--color-text-muted)]"
                  }`}
                >
                  {label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-0.5 py-1 px-2"
            >
              <Icon
                className={`w-[22px] h-[22px] transition-colors duration-150 ${
                  active
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-text-muted)]"
                }`}
                strokeWidth={active ? 2.2 : 1.7}
              />
              <span
                className={`text-[10px] font-medium leading-none ${
                  active
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-text-muted)]"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
