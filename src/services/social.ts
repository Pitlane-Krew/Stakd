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
  // Get IDs of users I follow
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
