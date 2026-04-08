import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// -------------------------------------------------------------------
// Friend Activity Feed
// -------------------------------------------------------------------

export interface FriendActivity {
  id: string;
  user_id: string;
  activity_type: string;
  entity_id: string | null;
  entity_type: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  // Joined data
  profile?: {
    display_name: string;
    avatar_url: string | null;
    username: string;
  };
}

/**
 * Get activity feed from followed users.
 */
export async function getFriendActivity(
  userId: string,
  limit = 30
): Promise<FriendActivity[]> {
  const isBeta = process.env.NEXT_PUBLIC_BETA_MODE === "true";

  // In beta mode, show ALL community activity (small user base)
  if (isBeta) {
    const { data, error } = await supabase
      .from("friend_activity")
      .select("*, profiles!friend_activity_user_id_fkey(display_name, avatar_url, username)")
      .neq("user_id", userId) // Exclude own activity
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as unknown as FriendActivity[];
  }

  // Production: only show activity from followed users
  const { data: follows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);

  const followingIds = (follows ?? []).map((f) => f.following_id);
  if (followingIds.length === 0) return [];

  const { data, error } = await supabase
    .from("friend_activity")
    .select("*, profiles!friend_activity_user_id_fkey(display_name, avatar_url, username)")
    .in("user_id", followingIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as FriendActivity[];
}

/**
 * Log a user activity event.
 * Called internally when a user takes an action.
 */
export async function logActivity(input: {
  user_id: string;
  activity_type: string;
  entity_id?: string;
  entity_type?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await supabase.from("friend_activity").insert({
    user_id: input.user_id,
    activity_type: input.activity_type,
    entity_id: input.entity_id ?? null,
    entity_type: input.entity_type ?? null,
    metadata: input.metadata ?? {},
  });
}

// -------------------------------------------------------------------
// Notifications
// -------------------------------------------------------------------

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  entity_id: string | null;
  entity_type: string | null;
  read: boolean;
  created_at: string;
}

export async function getNotifications(
  userId: string,
  limit = 50
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) return 0;
  return count ?? 0;
}

export async function markAsRead(notificationId: string): Promise<void> {
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);
}

export async function markAllAsRead(userId: string): Promise<void> {
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
}

// -------------------------------------------------------------------
// Posts & Feed (uses 006_social.sql posts table)
// -------------------------------------------------------------------

export interface PostWithProfile {
  id: string;
  user_id: string;
  content: string | null;
  image_urls: string[];
  post_type: string;
  item_id: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
  profiles: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export async function getRecentPosts(limit = 30): Promise<PostWithProfile[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*, profiles(display_name, username, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as PostWithProfile[];
}

export async function getFeedPosts(userId: string, limit = 30): Promise<PostWithProfile[]> {
  const isBeta = process.env.NEXT_PUBLIC_BETA_MODE === "true";

  // In beta mode, show ALL community posts (small user base)
  if (isBeta) {
    const { data, error } = await supabase
      .from("posts")
      .select("*, profiles(display_name, username, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []) as unknown as PostWithProfile[];
  }

  // Production: only show posts from followed users + self
  const { data: follows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);

  const followingIds = (follows ?? []).map((f) => f.following_id);
  const allIds = [...followingIds, userId];

  const { data, error } = await supabase
    .from("posts")
    .select("*, profiles(display_name, username, avatar_url)")
    .in("user_id", allIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as PostWithProfile[];
}

export async function createPost(input: {
  user_id: string;
  content: string;
  post_type?: string;
  image_urls?: string[];
  item_id?: string;
}): Promise<void> {
  const { error } = await supabase.from("posts").insert({
    user_id: input.user_id,
    content: input.content,
    post_type: input.post_type || "general",
    image_urls: input.image_urls || [],
    item_id: input.item_id ?? null,
  });
  if (error) throw error;
}

export async function toggleLike(userId: string, postId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from("likes")
    .select("user_id")
    .eq("user_id", userId)
    .eq("post_id", postId)
    .maybeSingle();

  if (existing) {
    await supabase.from("likes").delete().eq("user_id", userId).eq("post_id", postId);
    return false; // unliked
  } else {
    await supabase.from("likes").insert({ user_id: userId, post_id: postId });
    return true; // liked
  }
}

export async function getUserLikedPosts(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("likes")
    .select("post_id")
    .eq("user_id", userId);
  return new Set((data ?? []).map((l) => l.post_id));
}

export async function getFollowingSet(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);
  return new Set((data ?? []).map((f) => f.following_id));
}

/**
 * Discover other members.
 * In beta mode, returns ALL users (small community — everyone should
 * be visible and able to follow each other).
 * In production mode, caps at `limit` sorted by reputation.
 */
export async function discoverProfiles(currentUserId: string, limit = 50) {
  const isBeta = process.env.NEXT_PUBLIC_BETA_MODE === "true";

  let query = supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, bio, reputation_score")
    .neq("id", currentUserId)
    .order("reputation_score", { ascending: false });

  // In beta, show everyone; in prod, cap to limit
  if (!isBeta) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/**
 * Search profiles by username or display name.
 * Uses ILIKE for prefix + substring matching — works without
 * full-text search indexes on the profiles table.
 */
export async function searchProfiles(
  query: string,
  currentUserId: string,
  limit = 20
) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Strip leading @ if user types it
  const cleaned = trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
  const pattern = `%${cleaned}%`;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, bio, reputation_score")
    .neq("id", currentUserId)
    .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
    .order("reputation_score", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

// -------------------------------------------------------------------
// Collection Sharing
// -------------------------------------------------------------------

export async function getCollectionByShareCode(
  shareCode: string
) {
  const { data, error } = await supabase
    .from("collections")
    .select("*, profiles!collections_user_id_fkey(display_name, avatar_url, username)")
    .eq("share_code", shareCode)
    .eq("is_public", true)
    .single();

  if (error) return null;
  return data;
}

export async function generateShareCode(collectionId: string): Promise<string> {
  const code = Math.random().toString(36).substring(2, 10);
  await supabase
    .from("collections")
    .update({ share_code: code })
    .eq("id", collectionId);
  return code;
}

// -------------------------------------------------------------------
// Follow management
// -------------------------------------------------------------------

export async function followUser(
  followerId: string,
  followingId: string
): Promise<void> {
  await supabase.from("follows").insert({
    follower_id: followerId,
    following_id: followingId,
  });
}

export async function unfollowUser(
  followerId: string,
  followingId: string
): Promise<void> {
  await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);
}

export async function isFollowing(
  followerId: string,
  followingId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .single();

  return !!data;
}
