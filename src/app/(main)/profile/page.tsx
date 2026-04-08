"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Shield,
  Sparkles,
  ArrowLeftRight,
  ExternalLink,
  Eye,
  Settings,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import { useAdmin } from "@/hooks/useAdmin";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import ReputationBadge from "@/components/trade/ReputationBadge";
import type { Database } from "@/types/database";

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const { tierDef, isPaid } = useTier();
  const { isAdmin, adminRole } = useAdmin();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [location, setLocation] = useState(profile?.location || "");
  const [isPublic, setIsPublic] = useState(profile?.is_public ?? false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        location: location.trim() || null,
        is_public: isPublic,
      } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .eq("id", user.id);
    await refreshProfile?.();
    setEditing(false);
    setLoading(false);
  };

  if (!profile) return null;

  return (
    <div className="lg:max-w-lg lg:mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Your Profile</h1>

      {/* Profile card */}
      <Card className="p-5 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-accent)] flex items-center justify-center text-2xl font-bold text-white">
            {profile.display_name?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-lg">{profile.display_name}</p>
            <p className="text-sm text-[var(--color-text-muted)]">
              @{profile.username}
            </p>
          </div>
          <Link
            href={`/u/${profile.username}`}
            className="flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"
          >
            <Eye className="w-3 h-3" /> Public Page
          </Link>
        </div>

        {editing ? (
          <div className="space-y-3">
            <Input
              id="name"
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="text-sm text-[var(--color-text-muted)]">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Tell collectors about yourself..."
                className="w-full px-3 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg text-sm placeholder:text-[var(--color-text-muted)] resize-none"
              />
            </div>
            <Input
              id="location"
              label="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Los Angeles, CA"
            />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded border-[var(--color-border)]"
              />
              <span>Make my profile public</span>
            </label>
            <div className="flex gap-3">
              <Button onClick={handleSave} loading={loading}>
                Save
              </Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {profile.bio && <p className="text-sm">{profile.bio}</p>}
            {profile.location && (
              <p className="text-sm text-[var(--color-text-muted)]">
                {profile.location}
              </p>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setDisplayName(profile.display_name || "");
                setBio(profile.bio || "");
                setLocation(profile.location || "");
                setIsPublic(profile.is_public ?? false);
                setEditing(true);
              }}
            >
              Edit Profile
            </Button>
          </div>
        )}
      </Card>

      {/* Reputation & Trust */}
      <Card className="p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Shield className="w-4 h-4 text-[var(--color-accent)]" />
          Trust & Reputation
        </h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="flex justify-center mb-1">
              <ReputationBadge
                score={profile.reputation_score ?? 50}
                verifiedSeller={profile.verified_seller ?? false}
                size="lg"
              />
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">Trust Score</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{profile.total_trades ?? 0}</p>
            <p className="text-xs text-[var(--color-text-muted)]">Trades</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{profile.successful_trades ?? 0}</p>
            <p className="text-xs text-[var(--color-text-muted)]">Successful</p>
          </div>
        </div>
      </Card>

      {/* Subscription */}
      <Card className="p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
          Subscription
        </h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: `${tierDef.color}20`,
                color: tierDef.color,
              }}
            >
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold">{tierDef.name}</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {tierDef.tagline}
              </p>
            </div>
          </div>
          {!isPaid && (
            <Link href="/pricing">
              <Button size="sm">
                <Sparkles className="w-3.5 h-3.5" /> Upgrade
              </Button>
            </Link>
          )}
        </div>
        {isPaid && profile.tier_expires_at && (
          <p className="text-xs text-[var(--color-text-muted)]">
            Renews{" "}
            {new Date(profile.tier_expires_at).toLocaleDateString()}
          </p>
        )}
      </Card>

      {/* Admin Panel Access */}
      {isAdmin && (
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4 text-orange-400" />
            Admin Panel
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">
                Role:{" "}
                <span className="font-semibold capitalize text-orange-400">
                  {adminRole?.replace("_", " ")}
                </span>
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Manage users, moderation, analytics & settings
              </p>
            </div>
            <Link href="/admin">
              <Button size="sm" variant="secondary">
                <Settings className="w-3.5 h-3.5" /> Open Panel
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
