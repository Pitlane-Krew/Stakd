// ============================================================
// UNIVERSAL COLLECTIBLE DATABASE — Example Queries & Services
// ============================================================
// Production-ready query patterns for the catalog system.
// These are the building blocks for API routes and services.
// ============================================================

import { createClient } from '@/lib/supabase/server';
import type {
  SearchParams,
  SearchResult,
  AutocompleteResult,
  MasterItemWithDetails,
  UserCollectionItemWithDetails,
  SetWithCompletion,
  CategorySlug,
} from '@/types/catalog';

// ============================================================
// 1. SEARCH: Full-text catalog search
// ============================================================

export async function searchCatalog(params: SearchParams): Promise<SearchResult[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('search_catalog', {
    p_query: params.query,
    p_category_slug: params.category ?? null,
    p_set_id: params.set_id ?? null,
    p_limit: params.limit ?? 20,
    p_offset: params.offset ?? 0,
  });

  if (error) throw error;
  return data as SearchResult[];
}

// ============================================================
// 2. AUTOCOMPLETE: Fast prefix search for type-ahead
// ============================================================

export async function autocomplete(
  query: string,
  category?: CategorySlug
): Promise<AutocompleteResult[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('search_autocomplete', {
    p_query: query,
    p_category_slug: category ?? null,
    p_limit: 8,
  });

  if (error) throw error;
  return data as AutocompleteResult[];
}

// ============================================================
// 3. GET ITEM: Fetch master item with all details
// ============================================================

export async function getMasterItem(itemId: string): Promise<MasterItemWithDetails | null> {
  const supabase = await createClient();

  // Fetch item with category and set
  const { data: item, error: itemError } = await supabase
    .from('master_items')
    .select(`
      *,
      category:collectible_categories(*),
      set:collectible_sets(*)
    `)
    .eq('id', itemId)
    .single();

  if (itemError || !item) return null;

  // Fetch variants
  const { data: variants } = await supabase
    .from('master_variants')
    .select('*')
    .eq('master_item_id', itemId)
    .order('sort_order');

  // Fetch current prices for all variants
  const variantIds = (variants ?? []).map((v) => v.id);
  const { data: prices } = await supabase
    .from('catalog_current_prices')
    .select('*')
    .in('master_variant_id', variantIds);

  // Increment popularity (fire and forget)
  supabase
    .from('master_items')
    .update({ popularity: item.popularity + 1 })
    .eq('id', itemId)
    .then(() => {});

  return {
    ...item,
    variants: variants ?? [],
    current_prices: prices ?? [],
  } as MasterItemWithDetails;
}

// ============================================================
// 4. BROWSE SETS: List sets for a category
// ============================================================

export async function getSetsForCategory(
  categorySlug: CategorySlug,
  page = 0,
  limit = 24
) {
  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from('collectible_sets')
    .select(`
      *,
      category:collectible_categories!inner(slug)
    `, { count: 'exact' })
    .eq('category.slug', categorySlug)
    .eq('is_active', true)
    .order('release_date', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (error) throw error;
  return { sets: data ?? [], total: count ?? 0 };
}

// ============================================================
// 5. SET ITEMS: List all items in a set (for set completion)
// ============================================================

export async function getSetItems(setId: string, userId?: string): Promise<SetWithCompletion | null> {
  const supabase = await createClient();

  const { data: set, error } = await supabase
    .from('collectible_sets')
    .select(`
      *,
      category:collectible_categories(*)
    `)
    .eq('id', setId)
    .single();

  if (error || !set) return null;

  // All items in the set
  const { data: items } = await supabase
    .from('master_items')
    .select('*')
    .eq('set_id', setId)
    .eq('is_active', true)
    .order('set_position');

  // User's progress (if logged in)
  let progress = null;
  if (userId) {
    const { data } = await supabase
      .from('user_set_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('set_id', setId)
      .single();
    progress = data;
  }

  return {
    ...set,
    items: items ?? [],
    user_progress: progress,
  } as SetWithCompletion;
}

// ============================================================
// 6. ADD TO COLLECTION: Link a catalog item to user's collection
// ============================================================

export async function addToCollection(params: {
  userId: string;
  collectionId: string;
  masterItemId: string;
  masterVariantId?: string;
  conditionId?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  purchaseSource?: string;
  notes?: string;
  quantity?: number;
}) {
  const supabase = await createClient();

  // If no variant specified, use the default
  let variantId = params.masterVariantId;
  if (!variantId) {
    const { data: defaultVariant } = await supabase
      .from('master_variants')
      .select('id')
      .eq('master_item_id', params.masterItemId)
      .eq('is_default', true)
      .single();
    variantId = defaultVariant?.id;
  }

  // Look up current price
  let currentValue: number | null = null;
  if (variantId) {
    const { data: price } = await supabase
      .from('catalog_current_prices')
      .select('current_price')
      .eq('master_variant_id', variantId)
      .eq('condition_id', params.conditionId ?? '')
      .single();
    currentValue = price?.current_price ?? null;
  }

  const { data, error } = await supabase
    .from('user_collection_items')
    .insert({
      user_id: params.userId,
      collection_id: params.collectionId,
      master_item_id: params.masterItemId,
      master_variant_id: variantId,
      condition_id: params.conditionId,
      purchase_price: params.purchasePrice,
      purchase_date: params.purchaseDate,
      purchase_source: params.purchaseSource,
      notes: params.notes,
      quantity: params.quantity ?? 1,
      current_value: currentValue,
      value_updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================
// 7. MY COLLECTION: Fetch user's items with catalog data
// ============================================================

export async function getUserCollectionItems(
  collectionId: string,
  page = 0,
  limit = 50
): Promise<UserCollectionItemWithDetails[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_collection_items')
    .select(`
      *,
      master_item:master_items(id, name, image_url, attributes, category_id),
      master_variant:master_variants(id, name, slug),
      condition:condition_scales(id, name, abbreviation)
    `)
    .eq('collection_id', collectionId)
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (error) throw error;
  return (data ?? []) as UserCollectionItemWithDetails[];
}

// ============================================================
// 8. COLLECTION STATS: Portfolio overview
// ============================================================

export async function getCollectionStats(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_collection_items')
    .select('current_value, purchase_price, quantity, collection_id')
    .eq('user_id', userId);

  if (error) throw error;

  const items = data ?? [];
  const totalValue = items.reduce((sum, i) => sum + (i.current_value ?? 0) * i.quantity, 0);
  const totalCost = items.reduce((sum, i) => sum + (i.purchase_price ?? 0) * i.quantity, 0);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const roi = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

  return {
    total_items: totalItems,
    total_value: totalValue,
    total_cost: totalCost,
    total_roi: Math.round(roi * 100) / 100,
    collections: new Set(items.map((i) => i.collection_id)).size,
  };
}

// ============================================================
// 9. PRICE HISTORY: Get price chart data for a variant
// ============================================================

export async function getPriceHistory(
  variantId: string,
  conditionId?: string,
  days = 90
) {
  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('catalog_price_snapshots')
    .select('snapshot_date, avg_price, min_price, max_price, sale_count, trend_pct')
    .eq('master_variant_id', variantId)
    .eq('condition_id', conditionId ?? '')
    .gte('snapshot_date', since.toISOString().split('T')[0])
    .order('snapshot_date');

  if (error) throw error;
  return data ?? [];
}

// ============================================================
// 10. SET COMPLETION: Missing items for a set
// ============================================================

export async function getMissingSetItems(userId: string, setId: string) {
  const supabase = await createClient();

  // All items in the set
  const { data: allItems } = await supabase
    .from('master_items')
    .select('id, name, set_position, image_url, attributes')
    .eq('set_id', setId)
    .eq('is_active', true)
    .order('set_position');

  // Items user already owns
  const { data: owned } = await supabase
    .from('user_collection_items')
    .select('master_item_id')
    .eq('user_id', userId)
    .in(
      'master_item_id',
      (allItems ?? []).map((i) => i.id)
    );

  const ownedSet = new Set((owned ?? []).map((o) => o.master_item_id));

  return {
    all: allItems ?? [],
    owned: (allItems ?? []).filter((i) => ownedSet.has(i.id)),
    missing: (allItems ?? []).filter((i) => !ownedSet.has(i.id)),
    completion: allItems?.length
      ? Math.round((ownedSet.size / allItems.length) * 10000) / 100
      : 0,
  };
}
