export const APP_NAME = "STAKD";
export const APP_DESCRIPTION = "The Collector's Operating System";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Categories are now driven by the category registry.
// Import from @/config/category-registry for the full definitions.
// This re-export keeps backward compatibility for simple dropdowns.
import { getCategories } from "./category-registry";

export const CATEGORIES = getCategories().map((c) => ({
  value: c.id,
  label: c.label,
  icon: c.icon,
}));

export const CONDITIONS = [
  { value: "raw", label: "Raw / Ungraded" },
  { value: "graded", label: "Graded" },
  { value: "autographed", label: "Autographed" },
  { value: "sealed", label: "Sealed" },
  { value: "opened", label: "Opened / Used" },
] as const;

export const GRADING_COMPANIES = [
  { value: "PSA", label: "PSA" },
  { value: "BGS", label: "BGS / Beckett" },
  { value: "CGC", label: "CGC" },
  { value: "SGC", label: "SGC" },
] as const;

export const PRICE_SOURCES = [
  { value: "ebay", label: "eBay" },
  { value: "psa", label: "PSA" },
  { value: "goldin", label: "Goldin" },
  { value: "stockx", label: "StockX" },
  { value: "manual", label: "Manual" },
] as const;

export const POST_TYPES = [
  { value: "general", label: "General" },
  { value: "showcase", label: "Showcase" },
  { value: "restock", label: "Restock" },
  { value: "haul", label: "Haul" },
] as const;

// Map config
export const DEFAULT_MAP_CENTER = { lat: 39.8283, lng: -98.5795 }; // Center of US
export const DEFAULT_MAP_ZOOM = 4;

// Limits
export const MAX_IMAGES_PER_ITEM = 4;
export const MAX_FILE_SIZE_MB = 5;
export const MAX_ROUTE_STOPS = 12;
export const RESTOCK_EXPIRY_HOURS = 48;
