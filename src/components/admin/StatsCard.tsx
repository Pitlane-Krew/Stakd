"use client";

import {
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  CreditCard,
  ShieldAlert,
  Activity,
  Database,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Users,
  TrendingUp,
  TrendingDown,
  CreditCard,
  ShieldAlert,
  Activity,
  Database,
};

interface Props {
  label: string;
  value: string | number;
  iconName: string;
  color?: string;
  change?: number;
  changeLabel?: string;
  loading?: boolean;
}

export default function StatsCard({
  label,
  value,
  iconName,
  color = "var(--color-accent)",
  change,
  changeLabel = "vs last 7d",
  loading,
}: Props) {
  const Icon = iconMap[iconName] ?? Activity;

  if (loading) {
    return (
      <div className="bg-[#1a1a24] border border-white/10 rounded-xl p-5 animate-pulse">
        <div className="h-3 w-20 bg-white/10 rounded mb-3" />
        <div className="h-8 w-28 bg-white/10 rounded mb-2" />
        <div className="h-3 w-16 bg-white/10 rounded" />
      </div>
    );
  }

  const isPositive = change != null && change > 0;
  const isNegative = change != null && change < 0;
  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <div className="bg-[#1a1a24] border border-white/10 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-white/50 uppercase tracking-wider">
          {label}
        </p>
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>

      <p className="text-2xl font-bold text-white mb-1">{value}</p>

      {change != null && (
        <div
          className={`flex items-center gap-1 text-xs font-medium ${
            isPositive
              ? "text-emerald-400"
              : isNegative
              ? "text-red-400"
              : "text-white/40"
          }`}
        >
          <TrendIcon className="w-3 h-3" />
          <span>
            {isPositive ? "+" : ""}{change.toFixed(1)}% {changeLabel}
          </span>
        </div>
      )}
    </div>
  );
}
