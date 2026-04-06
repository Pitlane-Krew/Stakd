"use client";

import { ShieldCheck, Shield, ShieldAlert, Star, AlertTriangle } from "lucide-react";

interface Props {
  score: number;
  totalTrades?: number;
  verifiedSeller?: boolean;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

function getTrustLevel(score: number) {
  if (score >= 90) return { label: "Trusted", color: "#10b981", icon: ShieldCheck };
  if (score >= 70) return { label: "Reliable", color: "#3b82f6", icon: Shield };
  if (score >= 50) return { label: "Standard", color: "#6b7280", icon: Shield };
  if (score >= 30) return { label: "New", color: "#f59e0b", icon: ShieldAlert };
  return { label: "Unverified", color: "#ef4444", icon: AlertTriangle };
}

export default function ReputationBadge({
  score,
  totalTrades = 0,
  verifiedSeller = false,
  size = "md",
  showLabel = true,
}: Props) {
  const trust = getTrustLevel(score);
  const Icon = trust.icon;

  const sizeClasses = {
    sm: "text-xs gap-1",
    md: "text-sm gap-1.5",
    lg: "text-base gap-2",
  };
  const iconSize = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <div className={`inline-flex items-center ${sizeClasses[size]}`}>
      <Icon className={iconSize[size]} style={{ color: trust.color }} />
      {showLabel && (
        <span className="font-medium" style={{ color: trust.color }}>
          {score}%
        </span>
      )}
      {verifiedSeller && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
          <Star className="w-2.5 h-2.5" fill="currentColor" /> Verified
        </span>
      )}
    </div>
  );
}
