/**
 * STAKD Category Registry
 *
 * This is the single source of truth for all collectible verticals.
 * To add a new category, just add an entry here — the rest of the system
 * (forms, DB queries, display components, API) reads from this registry.
 *
 * ZERO hardcoding elsewhere. The UI, validation, and display all derive
 * from these definitions.
 */

export type FieldType = "text" | "number" | "select" | "boolean" | "year";

export interface CategoryField {
  key: string;           // DB column key in `item_attributes` JSONB
  label: string;         // Display label
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];  // For 'select' type
  group?: string;        // Visual grouping in forms ("details", "grading", "condition")
}

export interface CategoryDefinition {
  id: string;            // Stable identifier, matches DB value
  label: string;
  pluralLabel: string;
  icon: string;          // Lucide icon name
  color: string;         // Accent color for this category
  description: string;
  fields: CategoryField[];
  gradingEnabled: boolean;
  priceSources: string[];  // Which valuation sources apply
}

// ─── CATEGORY DEFINITIONS ───

const pokemon: CategoryDefinition = {
  id: "pokemon",
  label: "Pokémon / TCG",
  pluralLabel: "Pokémon Cards",
  icon: "Sparkles",
  color: "#FBBF24",
  description: "Trading cards from Pokémon, Magic, Yu-Gi-Oh, and other TCGs",
  gradingEnabled: true,
  priceSources: ["ebay", "psa", "tcgplayer"],
  fields: [
    { key: "card_name", label: "Card Name", type: "text", placeholder: "Charizard VMAX", required: true, group: "details" },
    { key: "set_name", label: "Set Name", type: "text", placeholder: "Evolving Skies", required: true, group: "details" },
    { key: "card_number", label: "Card Number", type: "text", placeholder: "203/203", group: "details" },
    { key: "rarity", label: "Rarity", type: "select", group: "details", options: [
      { value: "common", label: "Common" },
      { value: "uncommon", label: "Uncommon" },
      { value: "rare", label: "Rare" },
      { value: "holo_rare", label: "Holo Rare" },
      { value: "ultra_rare", label: "Ultra Rare" },
      { value: "secret_rare", label: "Secret Rare" },
      { value: "illustration_rare", label: "Illustration Rare" },
      { value: "special_art_rare", label: "Special Art Rare" },
      { value: "hyper_rare", label: "Hyper Rare" },
    ]},
    { key: "language", label: "Language", type: "select", group: "details", options: [
      { value: "en", label: "English" },
      { value: "jp", label: "Japanese" },
      { value: "kr", label: "Korean" },
      { value: "other", label: "Other" },
    ]},
    { key: "first_edition", label: "1st Edition", type: "boolean", group: "details" },
  ],
};

const sports_cards: CategoryDefinition = {
  id: "sports_cards",
  label: "Sports Cards",
  pluralLabel: "Sports Cards",
  icon: "Trophy",
  color: "#3B82F6",
  description: "Baseball, basketball, football, soccer, and other sports cards",
  gradingEnabled: true,
  priceSources: ["ebay", "psa", "goldin"],
  fields: [
    { key: "player_name", label: "Player Name", type: "text", placeholder: "Shohei Ohtani", required: true, group: "details" },
    { key: "team", label: "Team", type: "text", placeholder: "Los Angeles Dodgers", group: "details" },
    { key: "sport", label: "Sport", type: "select", required: true, group: "details", options: [
      { value: "baseball", label: "Baseball" },
      { value: "basketball", label: "Basketball" },
      { value: "football", label: "Football" },
      { value: "soccer", label: "Soccer" },
      { value: "hockey", label: "Hockey" },
      { value: "other", label: "Other" },
    ]},
    { key: "card_brand", label: "Brand", type: "select", group: "details", options: [
      { value: "topps", label: "Topps" },
      { value: "panini", label: "Panini" },
      { value: "upper_deck", label: "Upper Deck" },
      { value: "bowman", label: "Bowman" },
      { value: "fleer", label: "Fleer" },
      { value: "other", label: "Other" },
    ]},
    { key: "card_number", label: "Card Number", type: "text", placeholder: "#1", group: "details" },
    { key: "parallel", label: "Parallel / Variation", type: "text", placeholder: "Sapphire, Refractor, etc.", group: "details" },
    { key: "numbered_to", label: "Numbered (/x)", type: "number", placeholder: "99", group: "details" },
    { key: "rookie_card", label: "Rookie Card", type: "boolean", group: "details" },
    { key: "autographed", label: "Autographed", type: "boolean", group: "details" },
    { key: "relic", label: "Game-Used Relic", type: "boolean", group: "details" },
  ],
};

const hot_wheels: CategoryDefinition = {
  id: "hot_wheels",
  label: "Hot Wheels / Diecast",
  pluralLabel: "Hot Wheels",
  icon: "Car",
  color: "#EF4444",
  description: "Hot Wheels, Matchbox, and other diecast collectibles",
  gradingEnabled: false,
  priceSources: ["ebay"],
  fields: [
    { key: "model_name", label: "Model Name", type: "text", placeholder: "'67 Camaro", required: true, group: "details" },
    { key: "series", label: "Series / Line", type: "text", placeholder: "Super Treasure Hunt", group: "details" },
    { key: "collector_number", label: "Collector Number", type: "text", placeholder: "5/250", group: "details" },
    { key: "color", label: "Color", type: "text", placeholder: "Spectraflame Red", group: "details" },
    { key: "treasure_hunt", label: "Treasure Hunt", type: "boolean", group: "details" },
    { key: "super_treasure_hunt", label: "Super Treasure Hunt", type: "boolean", group: "details" },
    { key: "packaging", label: "Packaging", type: "select", group: "condition", options: [
      { value: "carded", label: "Carded (Sealed)" },
      { value: "loose", label: "Loose" },
      { value: "opened", label: "Opened / Displayed" },
    ]},
    { key: "real_riders", label: "Real Riders Wheels", type: "boolean", group: "details" },
  ],
};

const figures: CategoryDefinition = {
  id: "figures",
  label: "Figures & Toys",
  pluralLabel: "Figures",
  icon: "Ghost",
  color: "#8B5CF6",
  description: "Action figures, Funko Pops, statues, and collectible toys",
  gradingEnabled: false,
  priceSources: ["ebay", "stockx"],
  fields: [
    { key: "character_name", label: "Character / Name", type: "text", placeholder: "Spider-Man", required: true, group: "details" },
    { key: "brand", label: "Brand / Line", type: "select", group: "details", options: [
      { value: "funko", label: "Funko Pop" },
      { value: "marvel_legends", label: "Marvel Legends" },
      { value: "star_wars_black", label: "Star Wars Black Series" },
      { value: "neca", label: "NECA" },
      { value: "mcfarlane", label: "McFarlane" },
      { value: "sh_figuarts", label: "S.H. Figuarts" },
      { value: "hot_toys", label: "Hot Toys" },
      { value: "other", label: "Other" },
    ]},
    { key: "figure_number", label: "Figure / SKU Number", type: "text", placeholder: "#938", group: "details" },
    { key: "edition_type", label: "Edition", type: "select", group: "details", options: [
      { value: "standard", label: "Standard" },
      { value: "exclusive", label: "Exclusive" },
      { value: "limited", label: "Limited Edition" },
      { value: "chase", label: "Chase" },
      { value: "flocked", label: "Flocked" },
      { value: "gitd", label: "Glow in the Dark" },
    ]},
    { key: "vaulted", label: "Vaulted / Retired", type: "boolean", group: "details" },
    { key: "packaging", label: "Packaging", type: "select", group: "condition", options: [
      { value: "nib", label: "New in Box" },
      { value: "opened", label: "Opened / Displayed" },
      { value: "loose", label: "Loose (No Box)" },
      { value: "damaged_box", label: "Damaged Box" },
    ]},
  ],
};

const sneakers: CategoryDefinition = {
  id: "sneakers",
  label: "Sneakers",
  pluralLabel: "Sneakers",
  icon: "Footprints",
  color: "#F97316",
  description: "Sneakers, kicks, and limited-edition footwear",
  gradingEnabled: false,
  priceSources: ["ebay", "stockx", "goat"],
  fields: [
    { key: "model_name", label: "Model", type: "text", placeholder: "Air Jordan 1 Retro High OG", required: true, group: "details" },
    { key: "colorway", label: "Colorway", type: "text", placeholder: "Chicago", group: "details" },
    { key: "style_code", label: "Style Code", type: "text", placeholder: "DZ5485-612", group: "details" },
    { key: "size", label: "Size (US)", type: "text", placeholder: "10.5", required: true, group: "details" },
    { key: "brand", label: "Brand", type: "select", group: "details", options: [
      { value: "nike", label: "Nike" },
      { value: "jordan", label: "Jordan" },
      { value: "adidas", label: "Adidas" },
      { value: "new_balance", label: "New Balance" },
      { value: "yeezy", label: "Yeezy" },
      { value: "other", label: "Other" },
    ]},
    { key: "packaging", label: "Condition", type: "select", group: "condition", options: [
      { value: "ds", label: "Deadstock (DS)" },
      { value: "vnds", label: "Very Near DS (VNDS)" },
      { value: "used", label: "Used" },
    ]},
  ],
};

const formula_one: CategoryDefinition = {
  id: "formula_one",
  label: "Formula 1",
  pluralLabel: "Formula 1 Collectibles",
  icon: "Flag",
  color: "#E10600",
  description: "F1 trading cards (Topps, Turbo Attax), diecast models, and memorabilia",
  gradingEnabled: true,
  priceSources: ["ebay", "psa"],
  fields: [
    { key: "item_type", label: "Item Type", type: "select", required: true, group: "details", options: [
      { value: "tcg", label: "Trading Card" },
      { value: "diecast", label: "Diecast Model" },
      { value: "memorabilia", label: "Memorabilia / Apparel" },
      { value: "autograph", label: "Autograph" },
    ]},
    { key: "driver_name", label: "Driver / Team", type: "text", placeholder: "Max Verstappen", required: true, group: "details" },
    { key: "team", label: "Constructor", type: "select", group: "details", options: [
      { value: "red_bull", label: "Red Bull Racing" },
      { value: "ferrari", label: "Ferrari" },
      { value: "mercedes", label: "Mercedes" },
      { value: "mclaren", label: "McLaren" },
      { value: "aston_martin", label: "Aston Martin" },
      { value: "alpine", label: "Alpine" },
      { value: "williams", label: "Williams" },
      { value: "haas", label: "Haas" },
      { value: "rb", label: "RB (VCARB)" },
      { value: "sauber", label: "Sauber / Kick" },
      { value: "other", label: "Other / Classic" },
    ]},
    { key: "season", label: "Season / Year", type: "year", placeholder: "2025", group: "details" },
    { key: "set_name", label: "Set / Product Line", type: "text", placeholder: "Topps Chrome F1, Turbo Attax", group: "details" },
    { key: "card_number", label: "Card / Model Number", type: "text", placeholder: "#F1-MV1", group: "details" },
    { key: "rarity", label: "Rarity", type: "select", group: "details", options: [
      { value: "base", label: "Base" },
      { value: "parallel", label: "Parallel / Refractor" },
      { value: "insert", label: "Insert" },
      { value: "auto", label: "Autograph" },
      { value: "relic", label: "Race-Used Relic" },
      { value: "numbered", label: "Numbered" },
      { value: "one_of_one", label: "1/1" },
    ]},
    { key: "numbered_to", label: "Numbered (/x)", type: "number", placeholder: "99", group: "details" },
    { key: "scale", label: "Diecast Scale", type: "select", group: "details", options: [
      { value: "1_64", label: "1:64" },
      { value: "1_43", label: "1:43" },
      { value: "1_24", label: "1:24" },
      { value: "1_18", label: "1:18" },
      { value: "1_12", label: "1:12" },
      { value: "na", label: "N/A (Card)" },
    ]},
    { key: "diecast_brand", label: "Diecast Brand", type: "select", group: "details", options: [
      { value: "bburago", label: "Bburago" },
      { value: "minichamps", label: "Minichamps" },
      { value: "spark", label: "Spark" },
      { value: "amalgam", label: "Amalgam" },
      { value: "hot_wheels", label: "Hot Wheels" },
      { value: "other", label: "Other" },
    ]},
    { key: "autographed", label: "Autographed", type: "boolean", group: "details" },
    { key: "packaging", label: "Packaging", type: "select", group: "condition", options: [
      { value: "sealed", label: "Sealed / New" },
      { value: "opened", label: "Opened / Displayed" },
      { value: "loose", label: "Loose" },
    ]},
  ],
};

const one_piece: CategoryDefinition = {
  id: "one_piece",
  label: "One Piece TCG",
  pluralLabel: "One Piece Cards",
  icon: "Anchor",
  color: "#D97706",
  description: "One Piece Card Game by Bandai — leaders, characters, events, and stages",
  gradingEnabled: true,
  priceSources: ["ebay", "psa", "tcgplayer"],
  fields: [
    { key: "card_name", label: "Card Name", type: "text", placeholder: "Monkey.D.Luffy", required: true, group: "details" },
    { key: "set_name", label: "Set / Booster", type: "text", placeholder: "OP-01 Romance Dawn", required: true, group: "details" },
    { key: "card_number", label: "Card Number", type: "text", placeholder: "OP01-060", group: "details" },
    { key: "card_type", label: "Card Type", type: "select", group: "details", options: [
      { value: "leader", label: "Leader" },
      { value: "character", label: "Character" },
      { value: "event", label: "Event" },
      { value: "stage", label: "Stage" },
      { value: "don", label: "DON!!" },
    ]},
    { key: "rarity", label: "Rarity", type: "select", group: "details", options: [
      { value: "common", label: "Common (C)" },
      { value: "uncommon", label: "Uncommon (UC)" },
      { value: "rare", label: "Rare (R)" },
      { value: "super_rare", label: "Super Rare (SR)" },
      { value: "secret_rare", label: "Secret Rare (SEC)" },
      { value: "leader", label: "Leader (L)" },
      { value: "alt_art", label: "Alternate Art" },
      { value: "manga_art", label: "Manga Rare" },
      { value: "special_art", label: "Special Art (SP)" },
    ]},
    { key: "color", label: "Color", type: "select", group: "details", options: [
      { value: "red", label: "Red" },
      { value: "green", label: "Green" },
      { value: "blue", label: "Blue" },
      { value: "purple", label: "Purple" },
      { value: "black", label: "Black" },
      { value: "yellow", label: "Yellow" },
      { value: "multi", label: "Multi-Color" },
    ]},
    { key: "language", label: "Language", type: "select", group: "details", options: [
      { value: "en", label: "English" },
      { value: "jp", label: "Japanese" },
      { value: "other", label: "Other" },
    ]},
    { key: "first_edition", label: "1st Edition / Promo", type: "boolean", group: "details" },
  ],
};

const sports_memorabilia: CategoryDefinition = {
  id: "sports_memorabilia",
  label: "Sports Memorabilia",
  pluralLabel: "Sports Memorabilia",
  icon: "Medal",
  color: "#10B981",
  description: "Jerseys, signed items, game-used equipment, and other sports collectibles",
  gradingEnabled: false,
  priceSources: ["ebay", "goldin"],
  fields: [
    { key: "item_type", label: "Item Type", type: "select", required: true, group: "details", options: [
      { value: "jersey", label: "Jersey / Uniform" },
      { value: "autograph", label: "Signed Item" },
      { value: "game_used", label: "Game-Used Equipment" },
      { value: "bobblehead", label: "Bobblehead" },
      { value: "ticket", label: "Ticket Stub" },
      { value: "program", label: "Program / Media Guide" },
      { value: "ring", label: "Championship Ring / Replica" },
      { value: "photo", label: "Photo / Print" },
      { value: "other", label: "Other" },
    ]},
    { key: "player_name", label: "Player / Athlete", type: "text", placeholder: "Michael Jordan", required: true, group: "details" },
    { key: "team", label: "Team", type: "text", placeholder: "Chicago Bulls", group: "details" },
    { key: "sport", label: "Sport", type: "select", required: true, group: "details", options: [
      { value: "baseball", label: "Baseball" },
      { value: "basketball", label: "Basketball" },
      { value: "football", label: "Football" },
      { value: "soccer", label: "Soccer" },
      { value: "hockey", label: "Hockey" },
      { value: "mma", label: "MMA / Boxing" },
      { value: "f1", label: "Formula 1" },
      { value: "other", label: "Other" },
    ]},
    { key: "year", label: "Year / Season", type: "year", placeholder: "2024", group: "details" },
    { key: "autographed", label: "Autographed", type: "boolean", group: "details" },
    { key: "authentication", label: "Authentication", type: "select", group: "details", options: [
      { value: "jsa", label: "JSA" },
      { value: "beckett", label: "Beckett" },
      { value: "psa_dna", label: "PSA/DNA" },
      { value: "fanatics", label: "Fanatics" },
      { value: "steiner", label: "Steiner" },
      { value: "none", label: "None / Unauthenticated" },
      { value: "other", label: "Other" },
    ]},
    { key: "game_worn", label: "Game-Worn / Game-Used", type: "boolean", group: "details" },
    { key: "edition", label: "Edition / Numbered", type: "text", placeholder: "Limited to 500", group: "details" },
  ],
};

const comics: CategoryDefinition = {
  id: "comics",
  label: "Comics",
  pluralLabel: "Comics",
  icon: "BookOpen",
  color: "#06B6D4",
  description: "Comic books, graphic novels, and manga",
  gradingEnabled: true,
  priceSources: ["ebay", "cgc"],
  fields: [
    { key: "title", label: "Series Title", type: "text", placeholder: "Amazing Spider-Man", required: true, group: "details" },
    { key: "issue_number", label: "Issue Number", type: "text", placeholder: "#300", required: true, group: "details" },
    { key: "publisher", label: "Publisher", type: "select", group: "details", options: [
      { value: "marvel", label: "Marvel" },
      { value: "dc", label: "DC" },
      { value: "image", label: "Image" },
      { value: "dark_horse", label: "Dark Horse" },
      { value: "other", label: "Other" },
    ]},
    { key: "variant", label: "Variant Cover", type: "boolean", group: "details" },
    { key: "key_issue", label: "Key Issue", type: "boolean", group: "details" },
    { key: "first_appearance", label: "First Appearance Of", type: "text", placeholder: "Venom", group: "details" },
    { key: "signed", label: "Signed", type: "boolean", group: "details" },
  ],
};

// ─── REGISTRY ───

const ALL_CATEGORIES: CategoryDefinition[] = [
  pokemon,
  one_piece,
  formula_one,
  sports_cards,
  sports_memorabilia,
  hot_wheels,
  figures,
  sneakers,
  comics,
];

// Build lookup map for O(1) access
const CATEGORY_MAP = new Map<string, CategoryDefinition>(
  ALL_CATEGORIES.map((c) => [c.id, c])
);

/** Get all registered categories */
export function getCategories(): CategoryDefinition[] {
  return ALL_CATEGORIES;
}

/** Get a single category by ID */
export function getCategory(id: string): CategoryDefinition | undefined {
  return CATEGORY_MAP.get(id);
}

/** Get category field definitions for dynamic form rendering */
export function getCategoryFields(categoryId: string): CategoryField[] {
  return CATEGORY_MAP.get(categoryId)?.fields ?? [];
}

/** Get fields grouped by their `group` property */
export function getGroupedFields(categoryId: string): Record<string, CategoryField[]> {
  const fields = getCategoryFields(categoryId);
  return fields.reduce<Record<string, CategoryField[]>>((acc, field) => {
    const group = field.group || "other";
    if (!acc[group]) acc[group] = [];
    acc[group].push(field);
    return acc;
  }, {});
}

/** Validate category-specific attributes against the schema */
export function validateAttributes(
  categoryId: string,
  attributes: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const fields = getCategoryFields(categoryId);
  const errors: string[] = [];

  for (const field of fields) {
    if (field.required && !attributes[field.key]) {
      errors.push(`${field.label} is required`);
    }
    if (field.type === "select" && attributes[field.key] && field.options) {
      const validValues = field.options.map((o) => o.value);
      if (!validValues.includes(attributes[field.key] as string)) {
        errors.push(`Invalid value for ${field.label}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Get price sources for a category */
export function getPriceSources(categoryId: string): string[] {
  return CATEGORY_MAP.get(categoryId)?.priceSources ?? ["ebay"];
}

export type { CategoryDefinition, CategoryField };
export default ALL_CATEGORIES;
