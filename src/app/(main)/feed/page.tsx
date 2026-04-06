"use client";

import { useState } from "react";
import {
  Users,
  Search,
  UserPlus,
  Heart,
  MessageCircle,
  Share2,
  ShieldCheck,
  Star,
  Package,
  TrendingUp,
  Eye,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

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
// Demo Data
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
    description:
      "My 2020 Prizm Justin Herbert Silver just came back PSA 10! Population 847.",
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
    description:
      "Finally got the Shining Fates Charizard VMAX. Rainbow rare variant. Estimated at $185.",
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
    description:
      "My Hot Wheels collection just crossed 300 pieces. Started 6 months ago.",
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
    description:
      "Have: 2023 Bowman Chrome autos. Want: Prizm NFL parallels. DM if interested.",
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
          ? {
              ...f,
              liked: !f.liked,
              likes: f.liked ? f.likes - 1 : f.likes + 1,
            }
          : f
      )
    );
  }

  function getFeedIcon(type: FeedItem["type"]) {
    switch (type) {
      case "new_item":
        return <Package className="w-3.5 h-3.5 text-[var(--color-accent)]" />;
      case "grade":
        return <Star className="w-3.5 h-3.5 text-amber-400" />;
      case "trade":
        return <Share2 className="w-3.5 h-3.5 text-emerald-400" />;
      case "milestone":
        return <TrendingUp className="w-3.5 h-3.5 text-pink-400" />;
      default:
        return <Package className="w-3.5 h-3.5" />;
    }
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="lg:max-w-2xl lg:mx-auto space-y-5">
      {/* Tabs — pill style like Instagram/Twitter */}
      <div className="flex gap-1 p-1 rounded-2xl bg-[var(--color-bg-elevated)]">
        {(
          [
            { id: "feed" as const, label: "Feed" },
            { id: "discover" as const, label: "Discover" },
            { id: "friends" as const, label: "Following" },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] ${
              tab === id
                ? "bg-[var(--color-bg-card)] text-[var(--color-text)] shadow-sm"
                : "text-[var(--color-text-muted)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Feed Tab ── */}
      {tab === "feed" && (
        <div className="space-y-3">
          {feed.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--color-accent-subtle)] flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-[var(--color-accent)]" />
              </div>
              <h3 className="font-bold mb-1">Your feed is empty</h3>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">
                Follow collectors to see their activity
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-xl"
                onClick={() => setTab("discover")}
              >
                Discover Collectors
              </Button>
            </div>
          ) : (
            feed.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] space-y-3"
              >
                {/* User row */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-accent-subtle)] flex items-center justify-center text-xs font-bold text-[var(--color-accent)] shrink-0">
                    {getInitials(item.user.display_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold truncate">
                        {item.user.display_name}
                      </p>
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        {item.timestamp}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
                      {getFeedIcon(item.type)}
                      <span className="capitalize">{item.type.replace("_", " ")}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Actions — spaced like social apps */}
                <div className="flex items-center gap-1 pt-1 -mx-1">
                  <button
                    onClick={() => toggleLike(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all active:scale-95 ${
                      item.liked
                        ? "text-red-400"
                        : "text-[var(--color-text-muted)]"
                    }`}
                  >
                    <Heart
                      className="w-[18px] h-[18px]"
                      fill={item.liked ? "currentColor" : "none"}
                    />
                    <span className="text-xs font-medium tabular-nums">
                      {item.likes}
                    </span>
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-[var(--color-text-muted)] active:scale-95 transition-all">
                    <MessageCircle className="w-[18px] h-[18px]" />
                    <span className="text-xs font-medium tabular-nums">
                      {item.comments}
                    </span>
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-[var(--color-text-muted)] active:scale-95 transition-all ml-auto">
                    <Share2 className="w-[18px] h-[18px]" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Discover Tab ── */}
      {tab === "discover" && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search collectors..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
            />
          </div>

          {/* User cards — mobile-optimized stack */}
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="p-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] card-interactive"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-[var(--color-accent-subtle)] flex items-center justify-center text-sm font-bold text-[var(--color-accent)] shrink-0">
                    {getInitials(user.display_name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-sm truncate">
                        {user.display_name}
                      </p>
                      {user.auth_reputation >= 90 && (
                        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      @{user.username}
                    </p>
                    {user.bio && (
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1.5 line-clamp-2 leading-relaxed">
                        {user.bio}
                      </p>
                    )}

                    {/* Stats row */}
                    <div className="flex items-center gap-3 mt-2.5">
                      <span className="text-[11px] text-[var(--color-text-muted)] font-medium">
                        {user.item_count.toLocaleString()} items
                      </span>
                      <span className="text-[11px] text-[var(--color-text-muted)]">
                        &middot;
                      </span>
                      <span className="text-[11px] text-[var(--color-success)] font-bold">
                        ${user.total_value.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Follow button */}
                  <button
                    onClick={() => toggleFollow(user.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0 ${
                      user.is_following
                        ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]"
                        : "bg-[var(--color-accent)] text-white"
                    }`}
                  >
                    {user.is_following ? "Following" : "Follow"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Friends Tab ── */}
      {tab === "friends" && (
        <div className="space-y-3">
          {users.filter((u) => u.is_following).length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--color-accent-subtle)] flex items-center justify-center mb-4">
                <Heart className="w-8 h-8 text-[var(--color-accent)]" />
              </div>
              <h3 className="font-bold mb-1">Not following anyone yet</h3>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">
                Discover and follow collectors to build your network
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-xl"
                onClick={() => setTab("discover")}
              >
                Find Collectors
              </Button>
            </div>
          ) : (
            users
              .filter((u) => u.is_following)
              .map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] card-interactive"
                >
                  <div className="w-11 h-11 rounded-full bg-[var(--color-accent-subtle)] flex items-center justify-center text-sm font-bold text-[var(--color-accent)] shrink-0">
                    {getInitials(user.display_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-sm truncate">
                        {user.display_name}
                      </p>
                      {user.auth_reputation >= 90 && (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      {user.item_count.toLocaleString()} items &middot; $
                      {user.total_value.toLocaleString()}
                    </p>
                  </div>
                  <button className="p-2.5 rounded-xl bg-[var(--color-bg-elevated)] active:scale-95 transition-all">
                    <Eye className="w-4 h-4 text-[var(--color-text-muted)]" />
                  </button>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
}
