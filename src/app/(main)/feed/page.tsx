"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Search,
  Heart,
  MessageCircle,
  Share2,
  ShieldCheck,
  Package,
  TrendingUp,
  Star,
  Eye,
  Send,
  Plus,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import {
  getFeedPosts,
  getRecentPosts,
  createPost,
  toggleLike,
  getUserLikedPosts,
  getFollowingSet,
  discoverProfiles,
  followUser,
  unfollowUser,
  type PostWithProfile,
} from "@/services/social";

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
function getInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getFeedIcon(type: string) {
  switch (type) {
    case "showcase":
      return <Package className="w-3.5 h-3.5 text-[var(--color-accent)]" />;
    case "grade":
      return <Star className="w-3.5 h-3.5 text-amber-400" />;
    case "haul":
      return <TrendingUp className="w-3.5 h-3.5 text-pink-400" />;
    case "restock":
      return <Share2 className="w-3.5 h-3.5 text-emerald-400" />;
    default:
      return <Package className="w-3.5 h-3.5" />;
  }
}

// ---------------------------------------------------------------
// Component
// ---------------------------------------------------------------
type Tab = "feed" | "discover" | "friends";

export default function FeedPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("feed");
  const [search, setSearch] = useState("");

  // Data
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [profiles, setProfiles] = useState<Array<{
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    bio: string | null;
    reputation_score: number;
  }>>([]);
  const [loading, setLoading] = useState(true);

  // New post
  const [showCompose, setShowCompose] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [posting, setPosting] = useState(false);

  const loadFeed = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [feedData, likes, following] = await Promise.all([
        getFeedPosts(user.id).catch(() => getRecentPosts()),
        getUserLikedPosts(user.id),
        getFollowingSet(user.id),
      ]);
      setPosts(feedData);
      setLikedSet(likes);
      setFollowingSet(following);
    } catch (err) {
      console.error("Feed load error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadDiscover = useCallback(async () => {
    if (!user) return;
    try {
      const data = await discoverProfiles(user.id);
      setProfiles(data);
    } catch (err) {
      console.error("Discover error:", err);
    }
  }, [user]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    if (tab === "discover") loadDiscover();
  }, [tab, loadDiscover]);

  // Actions
  async function handleToggleLike(postId: string) {
    if (!user) return;
    const liked = await toggleLike(user.id, postId);
    setLikedSet((prev) => {
      const next = new Set(prev);
      if (liked) next.add(postId);
      else next.delete(postId);
      return next;
    });
    // Update local count
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, like_count: liked ? p.like_count + 1 : p.like_count - 1 }
          : p
      )
    );
  }

  async function handleToggleFollow(profileId: string) {
    if (!user) return;
    const isNowFollowing = !followingSet.has(profileId);
    try {
      if (isNowFollowing) {
        await followUser(user.id, profileId);
      } else {
        await unfollowUser(user.id, profileId);
      }
      setFollowingSet((prev) => {
        const next = new Set(prev);
        if (isNowFollowing) next.add(profileId);
        else next.delete(profileId);
        return next;
      });
    } catch (err) {
      console.error("Follow error:", err);
    }
  }

  async function handleNewPost() {
    if (!user || !newPostContent.trim()) return;
    setPosting(true);
    try {
      await createPost({ user_id: user.id, content: newPostContent.trim() });
      setNewPostContent("");
      setShowCompose(false);
      await loadFeed();
    } catch (err) {
      console.error("Post error:", err);
    } finally {
      setPosting(false);
    }
  }

  const filteredProfiles = search
    ? profiles.filter(
        (u) =>
          (u.display_name || "").toLowerCase().includes(search.toLowerCase()) ||
          (u.username || "").toLowerCase().includes(search.toLowerCase())
      )
    : profiles;

  return (
    <div className="lg:max-w-2xl lg:mx-auto space-y-5">
      {/* Tabs */}
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
          {/* Compose button */}
          {user && (
            <div className="space-y-3">
              {showCompose ? (
                <div className="p-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] space-y-3">
                  <textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="Share something with the community..."
                    rows={3}
                    className="w-full bg-transparent text-sm resize-none outline-none placeholder:text-[var(--color-text-muted)]"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowCompose(false)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleNewPost}
                      disabled={posting || !newPostContent.trim()}
                    >
                      <Send className="w-3.5 h-3.5" />
                      {posting ? "Posting..." : "Post"}
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCompose(true)}
                  className="w-full p-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] text-left text-sm text-[var(--color-text-muted)] hover:border-[var(--color-accent)] transition-colors flex items-center gap-3"
                >
                  <Plus className="w-4 h-4 text-[var(--color-accent)]" />
                  Share something with the community...
                </button>
              )}
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-2xl bg-[var(--color-bg-card)] animate-pulse space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-bg-elevated)]" />
                    <div className="space-y-1 flex-1">
                      <div className="h-3 w-24 bg-[var(--color-bg-elevated)] rounded" />
                      <div className="h-2 w-16 bg-[var(--color-bg-elevated)] rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-3/4 bg-[var(--color-bg-elevated)] rounded" />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--color-accent-subtle)] flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-[var(--color-accent)]" />
              </div>
              <h3 className="font-bold mb-1">Your feed is empty</h3>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">
                Follow collectors or post something to get started
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
            posts.map((post) => (
              <div
                key={post.id}
                className="p-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] space-y-3"
              >
                {/* User row */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-accent-subtle)] flex items-center justify-center text-xs font-bold text-[var(--color-accent)] shrink-0">
                    {post.profiles?.avatar_url ? (
                      <img src={post.profiles.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      getInitials(post.profiles?.display_name ?? null)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold truncate">
                        {post.profiles?.display_name || "Collector"}
                      </p>
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        {timeAgo(post.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
                      {getFeedIcon(post.post_type)}
                      <span className="capitalize">{post.post_type.replace("_", " ")}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                {post.content && (
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    {post.content}
                  </p>
                )}

                {/* Post images */}
                {post.image_urls?.length > 0 && (
                  <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden">
                    {post.image_urls.slice(0, 4).map((url, i) => (
                      <img key={i} src={url} alt="" className="w-full aspect-square object-cover" />
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 pt-1 -mx-1">
                  <button
                    onClick={() => handleToggleLike(post.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all active:scale-95 ${
                      likedSet.has(post.id)
                        ? "text-red-400"
                        : "text-[var(--color-text-muted)]"
                    }`}
                  >
                    <Heart
                      className="w-[18px] h-[18px]"
                      fill={likedSet.has(post.id) ? "currentColor" : "none"}
                    />
                    <span className="text-xs font-medium tabular-nums">
                      {post.like_count}
                    </span>
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-[var(--color-text-muted)] active:scale-95 transition-all">
                    <MessageCircle className="w-[18px] h-[18px]" />
                    <span className="text-xs font-medium tabular-nums">
                      {post.comment_count}
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

          <div className="space-y-3">
            {filteredProfiles.length === 0 ? (
              <div className="text-center py-12 text-sm text-[var(--color-text-muted)]">
                {search ? "No collectors found" : "No collectors to discover yet"}
              </div>
            ) : (
              filteredProfiles.map((profile) => (
                <div
                  key={profile.id}
                  className="p-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] card-interactive"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-[var(--color-accent-subtle)] flex items-center justify-center text-sm font-bold text-[var(--color-accent)] shrink-0">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        getInitials(profile.display_name)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-sm truncate">
                          {profile.display_name || "Collector"}
                        </p>
                        {(profile.reputation_score ?? 0) >= 90 && (
                          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        @{profile.username || "user"}
                      </p>
                      {profile.bio && (
                        <p className="text-xs text-[var(--color-text-secondary)] mt-1.5 line-clamp-2 leading-relaxed">
                          {profile.bio}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggleFollow(profile.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0 ${
                        followingSet.has(profile.id)
                          ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]"
                          : "bg-[var(--color-accent)] text-white"
                      }`}
                    >
                      {followingSet.has(profile.id) ? "Following" : "Follow"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Following Tab ── */}
      {tab === "friends" && (
        <div className="space-y-3">
          {profiles.filter((u) => followingSet.has(u.id)).length === 0 ? (
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
                onClick={() => { setTab("discover"); loadDiscover(); }}
              >
                Find Collectors
              </Button>
            </div>
          ) : (
            profiles
              .filter((u) => followingSet.has(u.id))
              .map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] card-interactive"
                >
                  <div className="w-11 h-11 rounded-full bg-[var(--color-accent-subtle)] flex items-center justify-center text-sm font-bold text-[var(--color-accent)] shrink-0">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      getInitials(profile.display_name)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-sm truncate">
                        {profile.display_name || "Collector"}
                      </p>
                      {(profile.reputation_score ?? 0) >= 90 && (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      @{profile.username || "user"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleFollow(profile.id)}
                    className="p-2.5 rounded-xl bg-[var(--color-bg-elevated)] active:scale-95 transition-all"
                  >
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
