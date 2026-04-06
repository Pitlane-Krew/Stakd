"use client";

import { getCategory, getCategoryFields } from "@/config/category-registry";
import type { Item } from "@/types/database";

interface Props {
  item: Item;
  compact?: boolean; // For card view vs detail view
}

/**
 * Renders category-specific attributes for display.
 * In compact mode (cards), shows 2-3 key attributes inline.
 * In full mode (detail page), shows all populated attributes.
 */
export default function CategoryAttributes({ item, compact = false }: Props) {
  const categoryDef = getCategory(item.category);
  const fields = getCategoryFields(item.category);
  const attrs = (item.attributes ?? {}) as Record<string, unknown>;

  if (!categoryDef || fields.length === 0) return null;

  // Get populated attributes only
  const populated = fields.filter(
    (f) => attrs[f.key] !== undefined && attrs[f.key] !== null && attrs[f.key] !== ""
  );

  if (populated.length === 0) return null;

  if (compact) {
    // Show first 2-3 key attributes as inline badges
    const highlights = populated
      .filter((f) => f.required || f.type === "boolean")
      .slice(0, 3);

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {highlights.map((field) => {
          const value = attrs[field.key];
          if (field.type === "boolean" && !value) return null;

          const displayValue = field.type === "boolean"
            ? field.label
            : field.type === "select"
              ? field.options?.find((o) => o.value === value)?.label ?? String(value)
              : String(value);

          return (
            <span
              key={field.key}
              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]"
            >
              {displayValue}
            </span>
          );
        })}
      </div>
    );
  }

  // Full display mode
  return (
    <div className="space-y-3">
      <h4
        className="text-xs uppercase tracking-wider font-medium"
        style={{ color: categoryDef.color }}
      >
        {categoryDef.label} Details
      </h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {populated.map((field) => {
          const value = attrs[field.key];
          let displayValue: string;

          if (field.type === "boolean") {
            displayValue = value ? "Yes" : "No";
          } else if (field.type === "select") {
            displayValue = field.options?.find((o) => o.value === value)?.label ?? String(value);
          } else {
            displayValue = String(value);
          }

          return (
            <div key={field.key}>
              <p className="text-xs text-[var(--color-text-muted)]">{field.label}</p>
              <p className="text-sm font-medium">{displayValue}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
