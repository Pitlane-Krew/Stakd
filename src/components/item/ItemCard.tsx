"use client";

import Link from "next/link";
import { ArrowLeftRight, DollarSign } from "lucide-react";
import Card from "@/components/ui/Card";
import CategoryAttributes from "./CategoryAttributes";
import { formatCurrency } from "@/lib/utils";
import type { Item } from "@/types/database";

interface Props {
  item: Item;
}

export default function ItemCard({ item }: Props) {
  return (
    <Link href={`/item/${item.id}`}>
      <Card hover className="overflow-hidden">
        {/* Image */}
        <div className="aspect-square bg-[var(--color-bg-elevated)] flex items-center justify-center relative">
          {item.image_urls?.[0] ? (
            <img
              src={item.image_urls[0]}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-[var(--color-text-muted)] text-xs">No image</div>
          )}

          {/* Badges */}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            {item.is_for_trade && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)] text-[10px] font-medium">
                <ArrowLeftRight className="w-3 h-3" /> Trade
              </span>
            )}
            {item.is_for_sale && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-success-subtle)] text-[var(--color-success)] text-[10px] font-medium">
                <DollarSign className="w-3 h-3" /> Sale
              </span>
            )}
          </div>
        </div>

        <div className="p-3 space-y-1">
          <h3 className="text-sm font-semibold truncate">{item.title}</h3>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-muted)] capitalize">{item.condition}</span>
            {item.grade_value && (
              <span className="text-xs font-medium text-[var(--color-accent)]">{item.grade_value}</span>
            )}
          </div>
          <CategoryAttributes item={item} compact />
          {item.estimated_value && (
            <p className="text-sm font-medium text-[var(--color-success)]">
              {formatCurrency(item.estimated_value)}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}
