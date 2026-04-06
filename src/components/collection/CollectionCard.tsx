"use client";

import Link from "next/link";
import { Layers } from "lucide-react";
import Card from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import { CATEGORIES } from "@/config/constants";
import { getCategory } from "@/config/category-registry";
import type { Collection } from "@/types/database";

interface Props {
  collection: Collection;
}

export default function CollectionCard({ collection }: Props) {
  const cat = CATEGORIES.find((c) => c.value === collection.category);
  const catColor = getCategory(collection.category)?.color || "#4B9CD3";

  return (
    <Link href={`/collection/${collection.id}`}>
      <Card hover className="overflow-hidden">
        {/* Cover image or gradient placeholder */}
        <div className="h-28 sm:h-32 relative bg-gradient-to-br from-[var(--color-bg-elevated)] to-[var(--color-bg-card)] flex items-center justify-center">
          {collection.cover_image_url ? (
            <img
              src={collection.cover_image_url}
              alt={collection.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: `${catColor}18` }}
            >
              <Layers className="w-6 h-6" style={{ color: catColor }} />
            </div>
          )}
          {/* Category badge */}
          {cat && (
            <span
              className="absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: catColor }}
            >
              {cat.label}
            </span>
          )}
        </div>

        <div className="p-3.5 space-y-1.5">
          <h3 className="font-bold text-sm truncate">{collection.name}</h3>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-muted)]">
              {collection.item_count} items
            </span>
            {Number(collection.total_value) > 0 && (
              <span className="text-xs font-bold text-[var(--color-success)]">
                {formatCurrency(Number(collection.total_value))}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
