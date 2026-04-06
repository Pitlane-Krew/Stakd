"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Search,
  UserPlus,
  Heart,
  MessageCircle,
  Share2,
  ShieldCheck,
  Star,
  Loader2,
  Package,
  TrendingUp,
  Eye,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------
interface UserProfile {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  auth_reputation: number;
  collection_count: number;
  item_count: number;
  total_value: number;
  is_following: boolean;
}

interface FeedItem {
  id: string;
  user: { display_name: string; username: string; avatar_url: string | null };
  type: "new_item" | "new_collection" | "trade" | "grade" | "milestone";
  title: string;
  description: string;
  image_url: string | null;
  timestamp: string;
  likes: number;
  comments: number;
  liked: boolean;
}

// ---------------------------------------------------------------
// Demo Data (will be replaced by real Supabase queries)
// ---------------------------------------------------------------
const DEMO_USERS: UserProfile[] = [
  {
    id: "1",
    display_name: "CardKing99",
    username: "cardking99",
    avatar_url: null,
    bio: "Pokemon TCG collector since 1999. Chasing that base set Charizard.",
    auth_reputation: 95,
    collection_count: 12,
    item_count: 847,
    total_value: 42500,
    is_following: false,
  },
  {
    id: "2",
    display_name: "SportsVault",
    username: "sportsvault",
    avatar_url: null,
    bio: "NFL & NBA cards. PSA submissions monthly. Top 1% collector.",
    auth_reputation: 88,
    collection_count: 8,
    item_count: 1243,
    total_value: 89000,
    is_following: true,
  },
  {
    id: "3",
    display_name: "WheelDealz",
    username: "wheeldealz",
    avatar_url: null,
    bio: "Hot Wheels treasure hunter. Super TH finds weekly.",
    auth_reputation: 72,
    collection_count: 5,
    item_count: 320,
    total_value: 8700,
    is_following: false,
  },
];

const DEMO_FEED: FeedItem[] = [
  {
    id: "f1",
    user: { display_name: "SportsVault", username: "sportsvault", avatar_url: null },
    type: "grade",
    title: "PSA 10 came back!",
    description: "My 2020 Prizm Justin Herbert Silver just came back PSA 10! Population 847.",
    image_url: null,
    timestamp: "2h ago",
    likes: 24,
    comments: 7,
    liked: false,
  },
  {
    id: "f2",
    user: { display_name: "CardKing99", username: "cardking99", avatar_url: null },
    type: "new_item",
    title: "Added Charizard VMAX to collection",
    description: "Finally got the Shining Fates Charizard VMAX. Rainbow rare variant. Estimated at $185.",
    image_url: null,
    timestamp: "4h ago",
    likes: 18,
    comments: 3,
    liked: true,
  },
  {
    id: "f3",
    user: { display_name: "WheelDealz", username: "wheeldealz", avatar_url: null },
    type: "milestone",
    title: "Hit 300 items!",
    description: "My Hot Wheels collection just crossed 300 pieces. Started 6 months ago.",
    image_url: null,
    timestamp: "6h ago",
    likes: 12,
    comments: 5,
    liked: false,
  },
  {
    id: "f4",
    user: { display_name: "SportsVault", username: "sportsvault", avatar_url: null },
    type: "trade",
    title: "Looking to trade",
    description: "Have: 2023 Bowman Chrome autos. Want: Prizm NFL parallels. DM if interested.",
    image_url: null,
    timestamp: "8h ago",
    likes: 6,
    comments: 11,
    liked: false,
  },
];

// ---------------------------------------------------------------
// Component
// ---------------------------------------------------------------
type Tab = "feed" | "discover" | "friends";

export default function FeedPage() {
  const [tab, setTab] = useState<Tab>("feed");
  const [search, setSearch] = useState("");
  const [feed, setFeed] = useState(DEMO_FEED);
  const [users, setUsers] = useState(DEMO_USERS);
  const [loading, setLoading] = useState(false);

  const filteredUsers = search
    ? users.filter(
        (u) =>
          u.display_name.toLowerCase().includes(search.toLowerCase()) ||
          u.username.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  function toggleFollow(userId: string) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, is_following: !u.is_following } : u
      )
    );
  }

  function toggleLike(feedId: string) {
    setFeed((prev) =>
      prev.map((f) =>
        f.id === feedId
          ? { ...f, liked: !f.liked, likes: f.liked ? f.likes - 1 : f.likes + 1 }
          : f
      )
    );
  }

  function getFeedIcon(type: FeedItem["type"]) {
    switch (type) {
      case "new_item": return <Package className="w-4 h-4 text-[var(--color-accent)]" />;
      case "grade": return <Star className="w-4 h-4 text-amber-400" />;
      case "trade": return <Share2 className="w-4 h-4 text-emerald-400" />;
      case "milestone": return <TrendingUp className="w-4 h-4 text-pink-400" />;
      default: return <Package className="w-4 h-4" />;
    }
  }

  function getInitials(name: string) {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Community</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Connect with collectors, share finds, and trade with trust
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--color-bg-elevated)]">
        {([
          { id: "feed" as const, label: "Feed", icon: Users },
          { id: "discover" as const, label: "Discover", icon: Search },
          { id: "friends" as const, label: "Friends", icon: Heart },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === id
                ? "bg-[var(--color-bg-card)] text-[var(--color-text)] shadow-sm"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Feed Tab ── */}
      {tab === "feed" && (
        <div className="space-y-4">
          {feed.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
              <p className="text-[var(--color-text-muted)]">Your feed is empty</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Follow other collectors to see their activity here
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => setTab("discover")}
              >
                Discover Collectors
              </Button>
            </div>
          ) : (
            feed.map((item) => (
              <Card key={item.id} className="p-4 space-y-3">
                {/* User row */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-accent-subtle)] flex items-center justify-center text-sm font-bold text-[var(--color-accent)]">
                    {getInitials(item.user.display_name)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{item.user.display_name}</p>
                    <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
                      {getFeedIcon(item.type)}
                      {item.timestamp}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">
                    {item.description}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 pt-1">
                  <button
                    onClick={() => toggleLike(item.id)}
                    className={`flex items-center gap-1.5 text-sm transition-colors ${
                      item.liked
                        ? "text-red-400"
                        : "text-[var(--color-text-muted)] hover:text-red-400"
                    }`}
                  >
                    <Heart
                      className="w-4 h-4"
                      fill={item.liked ? "currentColor" : "none"}
                    />
                    {item.likes}
                  </button>
                  <button className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                    <MessageCircle className="w-4 h-4" />
                    {item.comments}
                  </button>
                  <button className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ── Discover Tab ── */}
      {tab === "discover" && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search collectors by name or username..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              autoFocus
            />
          </div>

          {/* User cards */}
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <Card key={user.id} className="p-4">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-full bg-[var(--color-accent-subtle)] flex items-center justify-center text-lg font-bold text-[var(--color-accent)] flex-shrink-0">
                    {getInitials(user.display_name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{user.display_name}</p>
                      {user.auth_reputation >= 90 && (
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      @{user.username}
                    </p>
                    {user.bio && (
                      <p className="text-sm text-[var(--color-text-secondary)] mt-1.5">
                        {user.bio}
                      </p>
                    )}
                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-2.5 text-xs text-[var(--color-text-muted)]">
                      <span className="flex items-center gap-1">
                        <Package className="w-3.5 h-3.5" />
                        {user.item_count.toLocaleString()} items
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5" />
                        {user.collection_count} collections
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        ${user.total_value.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Follow / View */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant={user.is_following ? "secondary" : "primary"}
                      onClick={() => toggleFollow(user.id)}
                    >
                      {user.is_following ? (
                        <>Following</>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" /> Follow
                        </>
                      )}
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Eye className="w-3.5 h-3.5" /> View
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Friends Tab ── */}
      {tab === "friends" && (
        <div className="space-y-4">
          {users.filter((u) => u.is_following).length === 0 ? (
            <div className="text-center py-16">
              <Heart className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
              <p className="text-[var(--color-text-muted)]">
                You&apos;re not following anyone yet
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => setTab("discover")}
              >
                Find Collectors
              </Button>
            </div>
          ) : (
            users
              .filter((u) => u.is_following)
              .map((user) => (
                <Card key={user.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[var(--color-accent-subtle)] flex items-center justify-center text-sm font-bold text-[var(--color-accent)]">
                      {getInitials(user.display_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{user.display_name}</p>
                        {user.auth_reputation >= 90 && (
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {user.item_count.toLocaleString()} items · $
                        {user.total_value.toLocaleString()} value
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary">
                        <Eye className="w-3.5 h-3.5" /> Collection
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Share2 className="w-3.5 h-3.5" /> Trade
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
          )}
        </div>
      )}
    </div>
  );
}
