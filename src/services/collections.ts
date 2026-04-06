import { createClient } from "@/lib/supabase/client";
import type { Collection, Item } from "@/types/database";

const supabase = createClient();

export async function getCollections(userId: string): Promise<Collection[]> {
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getCollection(id: string): Promise<Collection | null> {
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createCollection(
  userId: string,
  input: { name: string; category: string; description?: string; is_public?: boolean }
): Promise<Collection> {
  const { data, error } = await supabase
    .from("collections")
    .insert({ user_id: userId, ...input })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCollection(
  id: string,
  input: Partial<Pick<Collection, "name" | "description" | "category" | "is_public" | "cover_image_url">>
): Promise<Collection> {
  const { data, error } = await supabase
    .from("collections")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCollection(id: string): Promise<void> {
  const { error } = await supabase.from("collections").delete().eq("id", id);
  if (error) throw error;
}

// Items
export async function getItems(collectionId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("collection_id", collectionId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getAllUserItems(userId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getItem(id: string): Promise<Item | null> {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createItem(
  input: {
    collection_id: string;
    user_id: string;
    title: string;
    category: string;
    condition: string;
    description?: string;
    grade_value?: string;
    grading_company?: string;
    year?: number;
    brand?: string;
    tags?: string[];
    estimated_value?: number;
    purchase_price?: number;
    purchase_date?: string;
    image_urls?: string[];
    is_for_sale?: boolean;
    is_for_trade?: boolean;
    attributes?: Record<string, unknown>;
  }
): Promise<Item> {
  const { data, error } = await supabase
    .from("items")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateItem(
  id: string,
  input: Partial<Omit<Item, "id" | "created_at" | "updated_at" | "user_id" | "collection_id">>
): Promise<Item> {
  const { data, error } = await supabase
    .from("items")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) throw error;
}

// Search items by category-specific attributes
export async function searchItemsByAttribute(
  category: string,
  attrKey: string,
  attrValue: string
): Promise<Item[]> {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("category", category)
    .ilike(`attributes->>${attrKey}`, `%${attrValue}%`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// Get items available for trade, with optional category filter
export async function getTradeableItems(category?: string): Promise<Item[]> {
  let query = supabase
    .from("items")
    .select("*")
    .eq("is_for_trade", true)
    .order("created_at", { ascending: false })
    .limit(50);

  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// Analytics
export async function getCollectionAnalytics(userId: string) {
  const { data: collections } = await supabase
    .from("collections")
    .select("id, name, category, item_count, total_value")
    .eq("user_id", userId);

  const totalItems = (collections ?? []).reduce((sum, c) => sum + c.item_count, 0);
  const totalValue = (collections ?? []).reduce((sum, c) => sum + Number(c.total_value), 0);
  const categoryBreakdown = (collections ?? []).reduce<Record<string, number>>((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + c.item_count;
    return acc;
  }, {});

  return {
    collectionCount: (collections ?? []).length,
    totalItems,
    totalValue,
    categoryBreakdown,
    collections: collections ?? [],
  };
}
