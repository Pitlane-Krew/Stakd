/**
 * STAKD Translation Type System
 *
 * These types enforce type-safe translation keys at compile time.
 * Each namespace maps to a JSON file in /messages/{locale}/.
 */

/** All available translation namespaces */
export type TranslationNamespace =
  | "common"
  | "auth"
  | "collections"
  | "items"
  | "restocks"
  | "routes"
  | "pricing"
  | "trades"
  | "social"
  | "scan"
  | "alerts"
  | "profile"
  | "glossary";

/** Common UI strings used everywhere */
export interface CommonTranslations {
  app_name: string;
  tagline: string;
  loading: string;
  error: string;
  success: string;
  cancel: string;
  save: string;
  delete: string;
  edit: string;
  create: string;
  search: string;
  filter: string;
  sort: string;
  back: string;
  next: string;
  previous: string;
  close: string;
  confirm: string;
  submit: string;
  view_all: string;
  no_results: string;
  required_field: string;
  optional: string;
  nav: {
    dashboard: string;
    collections: string;
    restocks: string;
    routes: string;
    scan: string;
    trades: string;
    feed: string;
    profile: string;
    settings: string;
  };
  theme: {
    light: string;
    dark: string;
    system: string;
  };
  time: {
    just_now: string;
    minutes_ago: string;
    hours_ago: string;
    days_ago: string;
    weeks_ago: string;
  };
}

/** Auth-related strings */
export interface AuthTranslations {
  sign_in: string;
  sign_up: string;
  sign_out: string;
  email: string;
  password: string;
  confirm_password: string;
  forgot_password: string;
  reset_password: string;
  or_continue_with: string;
  google: string;
  apple: string;
  no_account: string;
  have_account: string;
  welcome_back: string;
  create_account: string;
}

/** Collection management strings */
export interface CollectionTranslations {
  title: string;
  my_collections: string;
  create_collection: string;
  edit_collection: string;
  collection_name: string;
  description: string;
  category: string;
  public: string;
  private: string;
  item_count: string;
  total_value: string;
  empty_state: string;
  delete_confirm: string;
}

/** Item-related strings */
export interface ItemTranslations {
  add_item: string;
  edit_item: string;
  item_name: string;
  condition: string;
  grade: string;
  grading_company: string;
  estimated_value: string;
  purchase_price: string;
  purchase_date: string;
  for_trade: string;
  for_sale: string;
  tags: string;
  attributes: string;
  price_history: string;
  recent_sales: string;
  no_price_data: string;
}

/** Restock tracker strings */
export interface RestockTranslations {
  title: string;
  report_restock: string;
  store_name: string;
  store_address: string;
  item_found: string;
  freshness: string;
  verified: string;
  verify: string;
  nearby: string;
  detect_location: string;
  additional_details: string;
  add_photo: string;
  empty_state: string;
  map_view: string;
  list_view: string;
}

/** Route planner strings */
export interface RouteTranslations {
  title: string;
  plan_route: string;
  add_stop: string;
  optimize: string;
  save_route: string;
  stop_name: string;
  address: string;
  stops: string;
  distance: string;
  duration: string;
  empty_state: string;
}

/** Pricing/valuation strings */
export interface PricingTranslations {
  estimated_value: string;
  market_value: string;
  price_trend: string;
  roi: string;
  purchased_for: string;
  value_change: string;
  time_ranges: {
    "7d": string;
    "30d": string;
    "90d": string;
    "1y": string;
    all: string;
  };
  sources: {
    ebay: string;
    psa: string;
    goldin: string;
  };
}

/** Trade center strings */
export interface TradeTranslations {
  title: string;
  matches: string;
  want_list: string;
  proposals: string;
  browse: string;
  they_offer: string;
  they_want: string;
  match_score: string;
  accept: string;
  decline: string;
  message: string;
  add_to_want_list: string;
}

/** Social/feed strings */
export interface SocialTranslations {
  feed: string;
  post: string;
  comment: string;
  like: string;
  share: string;
  follow: string;
  unfollow: string;
  followers: string;
  following: string;
  translate_post: string;
  translate_comment: string;
  translating: string;
  show_original: string;
}

/** Scan feature strings */
export interface ScanTranslations {
  title: string;
  camera_scan: string;
  manual_entry: string;
  photo_ai: string;
  scanning: string;
  point_camera: string;
  scan_results: string;
  recent_scans: string;
  add_to_collection: string;
  report_restock: string;
  supported_formats: string;
}

/** Notification/alert strings */
export interface AlertTranslations {
  title: string;
  restock_alerts: string;
  add_alert: string;
  any_category: string;
  keyword: string;
  radius: string;
  enabled: string;
  disabled: string;
  new_matches: string;
  friend_added: string;
  price_change: string;
}

/** Profile strings */
export interface ProfileTranslations {
  title: string;
  edit_profile: string;
  achievements: string;
  recent_activity: string;
  collection_showcase: string;
  language: string;
  display_currency: string;
  distance_unit: string;
}

/** Collector-specific terminology glossary */
export interface GlossaryTranslations {
  graded: string;
  raw: string;
  sealed: string;
  booster_box: string;
  treasure_hunt: string;
  super_treasure_hunt: string;
  vaulted: string;
  chase: string;
  slabbed: string;
  first_edition: string;
  holographic: string;
  mint: string;
  near_mint: string;
  excellent: string;
  good: string;
  poor: string;
  psa: string;
  bgs: string;
  cgc: string;
  secret_rare: string;
  ultra_rare: string;
  common: string;
  uncommon: string;
  rare: string;
}

/** Full translations map */
export interface Messages {
  common: CommonTranslations;
  auth: AuthTranslations;
  collections: CollectionTranslations;
  items: ItemTranslations;
  restocks: RestockTranslations;
  routes: RouteTranslations;
  pricing: PricingTranslations;
  trades: TradeTranslations;
  social: SocialTranslations;
  scan: ScanTranslations;
  alerts: AlertTranslations;
  profile: ProfileTranslations;
  glossary: GlossaryTranslations;
}
