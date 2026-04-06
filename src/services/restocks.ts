import { createClient } from "@/lib/supabase/client";
import type { Restock } from "@/types/database";

const supabase = createClient();

export async function getRestocks(limit = 50): Promise<Restock[]> {
  const { data, error } = await supabase
    .from("restocks")
    .select("*")
    .order("reported_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getRestocksByCategory(
  category: string
): Promise<Restock[]> {
  const { data, error } = await supabase
    .from("restocks")
    .select("*")
    .eq("category", category)
    .order("reported_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data ?? [];
}

export async function createRestock(input: {
  user_id: string;
  store_name: string;
  store_address?: string;
  item_found: string;
  category?: string;
  description?: string;
  image_url?: string;
}): Promise<Restock> {
  const { data, error } = await supabase
    .from("restocks")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function verifyRestock(restockId: string): Promise<void> {
  // Increment verified_count via RPC or direct update
  const { error } = await supabase.rpc("verify_restock", {
    restock_id: restockId,
  });

  // Fallback if RPC doesn't exist yet
  if (error) {
    const { data: restock } = await supabase
      .from("restocks")
      .select("verified_count")
      .eq("id", restockId)
      .single();

    if (restock) {
      await supabase
        .from("restocks")
        .update({ verified_count: (restock.verified_count ?? 0) + 1 } as Record<string, unknown>)
        .eq("id", restockId);
    }
  }
}

export async function getUserRestocks(userId: string): Promise<Restock[]> {
  const { data, error } = await supabase
    .from("restocks")
    .select("*")
    .eq("user_id", userId)
    .order("reported_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
