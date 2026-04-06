"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ShieldCheck,
  ShieldOff,
  Ban,
  MoreVertical,
  Crown,
  Sparkles,
  Zap,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

interface AdminUser {
  id: string;
  username: string;
  display_name: string | null;
  email: string | null;
  tier: string;
  status: string;
  reputation_score: number;
  total_trades: number;
  created_at: string;
  last_sign_in_at: string | null;
  flagged_count: number;
}

const TIER_ICONS: Record<string, React.ReactNode> = {
  elite: <Crown className="w-3 h-3 text-amber-400" />,
  pro: <Sparkles className="w-3 h-3 text-purple-400" />,
  free: <Zap className="w-3 h-3 text-white/40" />,
};

const STATUS_COLORS: Record<string, string> = {
  active: "text-emerald-400 bg-emerald-400/10",
  suspended: "text-amber-400 bg-amber-400/10",
  banned: "text-red-400 bg-red-400/10",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search && { search }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(tierFilter !== "all" && { tier: tierFilter }),
      });
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, tierFilter]);

  useEffect(() => { load(); }, [load]);

  async function performAction(userId: string, action: string, payload?: Record<string, unknown>) {
    setActionLoading(true);
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      load();
    } finally {
      setActionLoading(false);
      setActionUserId(null);
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-sm text-white/50 mt-1">{total.toLocaleString()} total users</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by username or email..."
            className="w-full pl-10 pr-3 py-2.5 bg-[#1a1a24] border border-white/10 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 bg-[#1a1a24] border border-white/10 rounded-xl text-sm text-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>
        <select
          value={tierFilter}
          onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 bg-[#1a1a24] border border-white/10 rounded-xl text-sm text-white"
        >
          <option value="all">All Tiers</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="elite">Elite</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#1a1a24] border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Tier</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Trust</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Joined</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
                        <div className="space-y-1">
                          <div className="h-3 w-24 bg-white/10 rounded animate-pulse" />
                          <div className="h-2 w-32 bg-white/5 rounded animate-pulse" />
                        </div>
                      </div>
                    </td>
                    <td colSpan={5} />
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-white/40 text-sm">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center text-xs font-bold text-[var(--color-accent)] flex-shrink-0">
                          {(user.display_name || user.username)?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {user.display_name || user.username}
                            {user.flagged_count > 0 && (
                              <span className="ml-1.5 text-[10px] font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-full">
                                {user.flagged_count} flags
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-white/40">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {TIER_ICONS[user.tier]}
                        <span className="text-xs capitalize text-white/70">{user.tier}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_COLORS[user.status] ?? ""}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-white/60">{user.reputation_score}%</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-white/40">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setActionUserId(actionUserId === user.id ? null : user.id)}
                          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {actionUserId === user.id && (
                          <div className="absolute right-0 top-8 z-10 w-44 bg-[#232330] border border-white/15 rounded-xl shadow-2xl py-1">
                            {user.status === "active" ? (
                              <>
                                <button
                                  onClick={() => performAction(user.id, "suspend", { reason: "Admin action" })}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-amber-400 hover:bg-white/5"
                                  disabled={actionLoading}
                                >
                                  <ShieldOff className="w-3.5 h-3.5" /> Suspend
                                </button>
                                <button
                                  onClick={() => performAction(user.id, "ban", { reason: "Admin action" })}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-white/5"
                                  disabled={actionLoading}
                                >
                                  <Ban className="w-3.5 h-3.5" /> Ban
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => performAction(user.id, "restore")}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-emerald-400 hover:bg-white/5"
                                disabled={actionLoading}
                              >
                                <ShieldCheck className="w-3.5 h-3.5" /> Restore
                              </button>
                            )}
                            <div className="border-t border-white/10 my-1" />
                            <button
                              onClick={() => performAction(user.id, "grant_pro")}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-purple-400 hover:bg-white/5"
                              disabled={actionLoading}
                            >
                              <Sparkles className="w-3.5 h-3.5" /> Grant Pro
                            </button>
                            <button
                              onClick={() => performAction(user.id, "grant_elite")}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-amber-400 hover:bg-white/5"
                              disabled={actionLoading}
                            >
                              <Crown className="w-3.5 h-3.5" /> Grant Elite
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
            <p className="text-xs text-white/40">
              Page {page} of {totalPages} · {total.toLocaleString()} users
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-white/40 hover:text-white disabled:opacity-30 hover:bg-white/10"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-white/40 hover:text-white disabled:opacity-30 hover:bg-white/10"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
