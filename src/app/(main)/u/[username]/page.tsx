"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Shield,
  Star,
  Package,
  TrendingUp,
  Eye,
  Share2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Award,
  Flame,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

interface PublicProfile {
  display_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  auth_reputation: number;
  created_at: string;
}

interface PublicCollection {
  id: string;
  name: string;
  category: string;
  cover_image_url: string | null;
  item_count: number;
  total_value: number;
  show_values: boolean;
}

interface ShowcaseItem {
  id: string;
  title: string;
  category: string;
  image_urls: string[];
  estimated_value: number | null;
  grade_value: string | null;
  grading_company: string | null;
  condition: string;
}

export default function CollectionShowcasePage() {
  const params = useParams();
  const username = params.username as string;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [collections, setCollections] = useState<PublicCollection[]>([]);
  const [showcaseItems, setShowcaseItems] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, [username]);

  async function loadProfile() {
    setLoading(true);
    const supabase = createClient();

    // Get profile
    const { data: prof } = await supabase
      .from("profiles")
      .select("display_name, username, avatar_url, bio, auth_reputation, created_at")
      .eq("username", username)
      .eq("is_public", true)
      .single();

    if (!prof) {
      setLoading(false);
      return;
    }

    setProfile(prof);

    // Get public collections
    const { data: cols } = await supabase
      .from("collections")
      .select("id, name, category, cover_image_url, item_count, total_value")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .eq("user_id", (prof as any).id ?? prof.display_name)
      .eq("is_public", true)
      .order("total_value", { ascending: false });

    setCollections(cols ?? []);

    setLoading(false);
  }

  function copyShareLink() {
    navigator.clipboard.writeText(`${window.location.origin}/u/${username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function getInitials(name: string) {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }

  const totalItems = collections.reduce((s, c) => s + c.item_count, 0);
  const totalValue = collections.reduce((s, c) => s + c.total_value, 0);
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).getFullYear()
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <h1 className="text-xl font-bold">Collector not found</h1>
        <p className="text-[var(--color-text-muted)] mt-2">
          @{username} doesn&apos;t exist or their profile is private
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* ── Profile Hero ── */}
      <div className="relative">
        {/* Banner gradient */}
        <div className="h-32 rounded-2xl bg-gradient-to-r from-[var(--color-accent)] via-[var(--color-accent-hover)] to-[var(--color-success)] opacity-80" />

        {/* Profile card overlapping banner */}
        <div className="relative -mt-16 mx-4">
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              {/* Avatar */}
              <div className="w-24 h-24 -mt-16 rounded-2xl bg-[var(--color-accent)] flex items-center justify-center text-3xl font-bold text-white shadow-lg border-4 border-[var(--color-bg-card)]">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name}
                    className="w-full h-full rounded-2xl object-cover"
                  />
                ) : (
                  getInitials(profile.display_name)
                )}
              </div>

              {/* Name & bio */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{profile.display_name}</h1>
                  {(profile.auth_reputation ?? 0) >= 90 && (
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  )}
                </div>
                <p className="text-sm text-[var(--color-text-muted)]">
                  @{profile.username}
                  {memberSince && <> · Collector since {memberSince}</>}
                </p>
                {profile.bio && (
                  <p className="text-sm mt-2 text-[var(--color-text-secondary)]">
                    {profile.bio}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={copyShareLink}>
                  {copied ? (
                    <><Check className="w-3.5 h-3.5" /> Copied</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Share</>
                  )}
                </Button>
                <Button size="sm">
                  <Share2 className="w-3.5 h-3.5" /> Trade
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <Package className="w-5 h-5 text-[var(--color-accent)] mx-auto mb-1" />
          <p className="text-2xl font-bold">{totalItems.toLocaleString()}</p>
          <p className="text-xs text-[var(--color-text-muted)]">Items</p>
        </Card>
        <Card className="p-4 text-center">
          <Star className="w-5 h-5 text-amber-400 mx-auto mb-1" />
          <p className="text-2xl font-bold">{collections.length}</p>
          <p className="text-xs text-[var(--color-text-muted)]">Collections</p>
        </Card>
        <Card className="p-4 text-center">
          <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
          <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
          <p className="text-xs text-[var(--color-text-muted)]">Total Value</p>
        </Card>
        <Card className="p-4 text-center">
          <Shield className="w-5 h-5 text-blue-400 mx-auto mb-1" />
          <p className="text-2xl font-bold">{profile.auth_reputation ?? 0}%</p>
          <p className="text-xs text-[var(--color-text-muted)]">Trust Score</p>
        </Card>
      </div>

      {/* ── Collections Grid ── */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Collections</h2>
        {collections.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-2" />
            <p className="text-[var(--color-text-muted)]">No public collections yet</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((col) => (
              <Card
                key={col.id}
                className="overflow-hidden cursor-pointer hover:border-[var(--color-accent)] transition-all group"
                onClick={() =>
                  setActiveCollection(
                    activeCollection === col.id ? null : col.id
                  )
                }
              >
                {/* Cover */}
                <div className="h-28 bg-gradient-to-br from-[var(--color-bg-elevated)] to-[var(--color-bg-hover)] flex items-center justify-center">
                  {col.cover_image_url ? (
                    <img
                      src={col.cover_image_url}
                      alt={col.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-10 h-10 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors" />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold truncate">{col.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]">
                      {col.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-[var(--color-text-muted)]">
                    <span>{col.item_count} items</span>
                    <span className="text-[var(--color-success)]">
                      ${col.total_value.toLocaleString()}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── STAKD Badge ── */}
      <div className="text-center pt-4 pb-8 border-t border-[var(--color-border)]">
        <p className="text-xs text-[var(--color-text-muted)]">
          Powered by{" "}
          <span className="font-bold text-[var(--color-accent)]">STAKD</span>
          {" "}— The Collector&apos;s OS
        </p>
      </div>
    </div>
  );
}
