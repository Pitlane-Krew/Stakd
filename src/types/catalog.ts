// ============================================================
// UNIVERSAL COLLECTIBLE DATABASE — TypeScript Types
// ============================================================

// ---- Categories ----

export interface CollectibleCategory {
  id: string;
  slug: CategorySlug;
  name: string;
  description: string | null;
  icon_url: string | null;
  sort_order: number;
  is_active: boolean;
  metadata: CategoryMetadata;
  created_at: string;
  updated_at: string;
}

export type CategorySlug =
  | 'pokemon_tcg'
  | 'sports_cards'
  | 'hot_wheels'
  | 'figures';

export interface CategoryMetadata {
  grading_supported: boolean;
  default_condition_scale: string;
}

export interface CollectibleSubcategory {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryAttributeDef {
  id: string;
  category_id: string;
  attribute_key: string;
  display_name: string;
  data_type: 'text' | 'number' | 'boolean' | 'select' | 'multi_select';
  is_required: boolean;
  is_searchable: boolean;
  is_filterable: boolean;
  options: string[] | null;
  sort_order: number;
  created_at: string;
}

// ---- Sets / Series ----

export interface CollectibleSet {
  id: string;
  category_id: string;
  subcategory_id: string | null;
  slug: string;
  name: string;
  description: string | null;
  release_date: string | null;
  total_items: number | null;
  image_url: string | null;
  logo_url: string | null;
  attributes: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ---- Master Items ----

export interface MasterItem {
  id: string;
  category_id: string;
  set_id: string | null;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  set_position: number | null;
  attributes: Record<string, unknown>;
  external_ids: Record<string, string>;
  tags: string[];
  popularity: number;
  is_active: boolean;
  created_by: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

// Category-specific attribute interfaces
export interface PokemonTCGAttributes {
  card_name: string;
  card_number: string;
  rarity?: string;
  card_type?: string;
  holo_type?: string;
  language?: string;
  first_edition?: boolean;
  shadowless?: boolean;
}

export interface SportsCardAttributes {
  player_name: string;
  team?: string;
  sport: string;
  card_year?: number;
  brand?: string;
  card_number?: string;
  is_rookie?: boolean;
  is_auto?: boolean;
  is_relic?: boolean;
  serial_numbered?: string;
}

export interface HotWheelsAttributes {
  model_name: string;
  series_name?: string;
  case_code?: string;
  collector_number?: string;
  color?: string;
  is_treasure_hunt?: boolean;
  is_super_treasure_hunt?: boolean;
  wheel_type?: string;
  year_released?: number;
}

export interface FigureAttributes {
  figure_name: string;
  brand?: string;
  figure_line?: string;
  figure_number?: string;
  edition?: string;
  is_vaulted?: boolean;
  is_chase?: boolean;
  scale?: string;
}

// Union type for type-safe attribute access
export type CategoryAttributes =
  | PokemonTCGAttributes
  | SportsCardAttributes
  | HotWheelsAttributes
  | FigureAttributes;

// ---- Variants ----

export interface MasterVariant {
  id: string;
  master_item_id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  attributes: Record<string, unknown>;
  sku: string | null;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ---- Conditions ----

export interface ConditionScale {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  abbreviation: string | null;
  grade_value: number | null;
  grading_company: string | null;
  sort_order: number;
  description: string | null;
  created_at: string;
}

// ---- Prices ----

export interface CatalogPriceHistory {
  id: string;
  master_variant_id: string;
  condition_id: string | null;
  source: PriceSource;
  price: number;
  currency: string;
  sale_date: string;
  listing_url: string | null;
  listing_title: string | null;
  is_auction: boolean;
  metadata: Record<string, unknown>;
  fetched_at: string;
  created_at: string;
}

export type PriceSource = 'ebay' | 'psa' | 'goldin' | 'stockx' | 'tcgplayer' | 'manual';

export interface CatalogPriceSnapshot {
  id: string;
  master_variant_id: string;
  condition_id: string | null;
  snapshot_date: string;
  avg_price: number | null;
  min_price: number | null;
  max_price: number | null;
  median_price: number | null;
  sale_count: number;
  trend: 'up' | 'down' | 'stable' | null;
  trend_pct: number | null;
  source_breakdown: Record<string, number>;
  created_at: string;
}

export interface CatalogCurrentPrice {
  id: string;
  master_variant_id: string;
  condition_id: string | null;
  current_price: number | null;
  price_7d_ago: number | null;
  price_30d_ago: number | null;
  price_90d_ago: number | null;
  trend_7d: number | null;
  trend_30d: number | null;
  trend_90d: number | null;
  last_sale_price: number | null;
  last_sale_date: string | null;
  last_sale_source: string | null;
  total_sales_30d: number;
  confidence: 'low' | 'medium' | 'high';
  updated_at: string;
}

// ---- User Collection Link ----

export interface UserCollectionItem {
  id: string;
  user_id: string;
  collection_id: string;
  master_item_id: string | null;
  master_variant_id: string | null;
  condition_id: string | null;
  custom_title: string | null;
  custom_image_urls: string[] | null;
  notes: string | null;
  purchase_price: number | null;
  purchase_date: string | null;
  purchase_source: string | null;
  custom_attributes: Record<string, unknown>;
  is_for_sale: boolean;
  is_for_trade: boolean;
  sale_price: number | null;
  is_graded: boolean;
  grade_value: string | null;
  grading_company: string | null;
  cert_number: string | null;
  quantity: number;
  current_value: number | null;
  value_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSetProgress {
  id: string;
  user_id: string;
  set_id: string;
  items_owned: number;
  items_total: number;
  completion_pct: number;
  last_item_added: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserWantListItem {
  id: string;
  user_id: string;
  master_item_id: string | null;
  master_variant_id: string | null;
  max_price: number | null;
  min_condition_id: string | null;
  priority: number;
  notes: string | null;
  notify_on_price: boolean;
  created_at: string;
}

// ---- Search ----

export interface SearchResult {
  entity_type: 'master_item' | 'set' | 'variant';
  entity_id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  category_slug: CategorySlug;
  set_name: string | null;
  attributes: Record<string, unknown>;
  popularity: number;
  has_price_data: boolean;
  verified: boolean;
  rank: number;
}

export interface SearchParams {
  query: string;
  category?: CategorySlug;
  set_id?: string;
  limit?: number;
  offset?: number;
}

export interface AutocompleteResult {
  entity_id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  category_slug: CategorySlug;
}

// ---- Data Ingestion ----

export interface ImportJob {
  id: string;
  category_id: string;
  source: string;
  source_version: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  total_records: number;
  processed: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  error_log: Array<{ record: unknown; error: string }>;
  started_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ---- Enriched/Joined types for UI ----

export interface MasterItemWithDetails extends MasterItem {
  category: CollectibleCategory;
  set: CollectibleSet | null;
  variants: MasterVariant[];
  current_prices: CatalogCurrentPrice[];
}

export interface UserCollectionItemWithDetails extends UserCollectionItem {
  master_item: MasterItem | null;
  master_variant: MasterVariant | null;
  condition: ConditionScale | null;
  current_price: CatalogCurrentPrice | null;
}

export interface SetWithCompletion extends CollectibleSet {
  category: CollectibleCategory;
  user_progress: UserSetProgress | null;
  items: MasterItem[];
}
