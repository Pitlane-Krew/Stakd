"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  ShieldAlert,
  FileText,
  BarChart3,
  Database,
  ScrollText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Zap,
  Menu,
  X,
} from "lucide-react";
import type { AdminRole } from "@/lib/admin-auth";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: AdminRole[];
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, roles: ["super_admin", "admin"] },
  { href: "/admin/users", label: "Users", icon: Users, roles: ["super_admin", "admin", "support"] },
  { href: "/admin/memberships", label: "Memberships", icon: CreditCard, roles: ["super_admin", "admin"] },
  { href: "/admin/moderation", label: "Moderation", icon: ShieldAlert, roles: ["super_admin", "admin", "moderator"] },
  { href: "/admin/cms", label: "CMS", icon: FileText, roles: ["super_admin", "admin"] },
  { href: "/admin/pricing", label: "Pricing Data", icon: Database, roles: ["super_admin", "admin"] },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, roles: ["super_admin", "admin"] },
  { href: "/admin/system", label: "System", icon: Settings, roles: ["super_admin", "admin"] },
  { href: "/admin/logs", label: "Audit Logs", icon: ScrollText, roles: ["super_admin", "admin"] },
];

const ROLE_COLORS: Record<AdminRole, string> = {
  super_admin: "text-amber-400",
  admin: "text-[var(--color-accent)]",
  moderator: "text-emerald-400",
  support: "text-blue-400",
};

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  moderator: "Moderator",
  support: "Support",
};

interface Props {
  role: AdminRole;
  children: React.ReactNode;
}

export default function AdminShell({ role, children }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${collapsed ? "justify-center" : ""}`}>
        <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)] flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-bold text-white">STAKD</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Admin</p>
          </div>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-white/10">
          <span className={`text-xs font-semibold ${ROLE_COLORS[role]}`}>
            {ROLE_LABELS[role]}
          </span>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {visibleItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              } ${collapsed ? "justify-center" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.badge && (
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className={`px-2 pb-4 space-y-1 border-t border-white/10 pt-4`}>
        <Link
          href="/dashboard"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all ${collapsed ? "justify-center" : ""}`}
          title={collapsed ? "Back to App" : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Back to App</span>}
        </Link>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-[#0f0f14]">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col flex-shrink-0 bg-[#1a1a24] border-r border-white/10 transition-all duration-200 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        <NavContent />

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-10 border-t border-white/10 text-white/40 hover:text-white/80 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex flex-col w-56 bg-[#1a1a24] border-r border-white/10 z-10">
            <NavContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-6 bg-[#1a1a24] border-b border-white/10 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-white/60 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[var(--color-accent)] flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-bold text-white">STAKD Admin</span>
          </div>
          <span className={`text-xs font-semibold ${ROLE_COLORS[role]}`}>
            {ROLE_LABELS[role]}
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
