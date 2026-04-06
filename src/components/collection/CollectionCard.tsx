"use client";

import Link from "next/link";
import { Layers } from "lucide-react";
import Card from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import { CATEGORIES } from "@/config/constants";
import type { Collection } from "@/types/database";

interface Props {
  collection: Collection;
}

export default function CollectionCard({ collection }: Props) {
  const cat = CATEGORIES.find((c) => c.value === collection.category);

  return (
    <Link href={`/collection/${collection.id}`}>
      <Card hover className="overflow-hidden">
        {/* Cover image or gradient placeholder */}
        <div className="h-32 bg-gradient-to-br from-[var(--color-accent-subtle)] to-[var(--color-bg-elevated)] flex items-center justify-center">
          {collection.cover_image_url ? (
            <img
              src={collection.cover_image_url}
              alt={collection.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Layers className="w-10 h-10 text-[var(--color-accent)]" />
          )}
        </div>

        <div className="p-4 space-y-2">
          <h3 className="font-semibold truncate">{collection.name}</h3>
          <div className="flex items-center justify-between text-sm text-[var(--color-text-muted)]">
            <span>{cat?.label || collection.category}</span>
            <span>{collection.item_count} items</span>
          </div>
          {Number(collection.total_value) > 0 && (
            <p className="text-sm font-medium text-[var(--color-success)]">
              {formatCurrency(Number(collection.total_value))}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}
