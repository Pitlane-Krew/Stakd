"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowLeftRight,
  DollarSign,
  Edit3,
  Tag,
  TrendingUp,
  Share2,
  Bell,
  ShoppingBag,
} from "lucide-react";
import { getItem, updateItem } from "@/services/collections";
import { getCategory } from "@/config/category-registry";
import CategoryAttributes from "@/components/item/CategoryAttributes";
import PriceChart from "@/components/valuation/PriceChart";
import RecentSales from "@/components/valuation/RecentSales";
import ListingCreator from "@/components/marketplace/ListingCreator";
import PriceAlertManager from "@/components/pricing/PriceAlertManager";
import ShareCard from "@/components/social/ShareCard";
import MarketMomentum from "@/components/pricing/MarketMomentum";
import UpgradeGate from "@/components/tier/UpgradeGate";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/utils";
import type { Item, PriceHistory } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [item, setItem] = useState<Item | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [showPanel, setShowPanel] = useState<"sell" | "alert" | "share" | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [itemData, priceData] = await Promise.all([
          getItem(id),
          fetchPriceHistory(id),
        ]);
        setItem(itemData);
        setPriceHistory(priceData);
      } catch (err) {
        console.error("Failed to load item:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function fetchPriceHistory(itemId: string): Promise<PriceHistory[]> {
    const supabase = createClient();
    const { data } = await supabase
      .from("price_history")
      .select("*")
      .eq("item_id", itemId)
      .order("fetched_at", { ascending: false });
    return data ?? [];
  }

  async function toggleTrade() {
    if (!item) return;
    const updated = await updateItem(item.id, {
      is_for_trade: !item.is_for_trade,
    });
    setItem(updated);
  }

  async function toggleSale() {
    if (!item) return;
    const updated = await updateItem(item.id, {
      is_for_sale: !item.is_for_sale,
    });
    setItem(updated);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-[var(--color-text-muted)]">
          Loading...
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-8 text-center">
        <p className="text-[var(--color-text-muted)]">Item not found</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-[var(--color-accent)] hover:underline text-sm"
        >
          Go back
        </button>
      </div>
    );
  }

  const categoryDef = getCategory(item.category);
  const images = item.image_urls ?? [];
  const roi =
    item.purchase_price && item.estimated_value
      ? (
          ((item.estimated_value - item.purchase_price) / item.purchase_price) *
          100
        ).toFixed(1)
      : null;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to collection
      </button>

      {/* Hero: Image + Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Section */}
        <div className="space-y-3">
          <div className="aspect-square rounded-2xl bg-[var(--color-bg-surface)] flex items-center justify-center overflow-hidden">
            {images[activeImage] ? (
              <img
                src={images[activeImage]}
                alt={item.title}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-[var(--color-text-muted)] text-sm">
                No image
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    i === activeImage
                      ? "border-[var(--color-accent)]"
                      : "border-transparent"
                  }`}
                >
                  <img
                    src={url}
                    alt={`${item.title} ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="space-y-5">
          {/* Category badge */}
          {categoryDef && (
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                backgroundColor: `${categoryDef.color}20`,
                color: categoryDef.color,
              }}
            >
              {categoryDef.label}
            </span>
          )}

          <h1 className="text-2xl lg:text-3xl font-bold">{item.title}</h1>

          {item.description && (
            <p className="text-sm text-[var(--color-text-secondary)]">
              {item.description}
            </p>
          )}

          {/* Value card */}
          <div className="rounded-xl bg-[var(--color-bg-surface)] p-4 space-y-2">
            <p className="text-xs text-[var(--color-text-muted)] font-medium">
              Estimated Value
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-[var(--color-success)]">
                {formatCurrency(item.estimated_value)}
              </span>
              {roi && (
                <span
                  className={`flex items-center gap-1 text-sm font-semibold ${
                    parseFloat(roi) >= 0
                      ? "text-[var(--color-success)]"
                      : "text-red-400"
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  {parseFloat(roi) >= 0 ? "+" : ""}
                  {roi}% ROI
                </span>
              )}
            </div>
            {item.purchase_price && (
              <p className="text-xs text-[var(--color-text-muted)]">
                Purchased for {formatCurrency(item.purchase_price)}
                {item.purchase_date &&
                  ` on ${new Date(item.purchase_date).toLocaleDateString()}`}
              </p>
            )}
          </div>

          {/* Condition & Grade */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-[var(--color-text-muted)] font-medium">
                Condition
              </p>
              <p className="text-sm font-semibold capitalize">
                {item.condition}
              </p>
            </div>
            {item.grade_value && (
              <div>
                <p className="text-xs text-[var(--color-text-muted)] font-medium">
                  Grade
                </p>
                <p className="text-sm font-semibold text-[var(--color-accent)]">
                  {item.grade_value}
                </p>
              </div>
            )}
            {item.grading_company && (
              <div>
                <p className="text-xs text-[var(--color-text-muted)] font-medium">
                  Grading Company
                </p>
                <p className="text-sm font-semibold">{item.grading_company}</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={toggleTrade}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                item.is_for_trade
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-[var(--color-accent-subtle)] text-[var(--color-accent)]"
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
              {item.is_for_trade ? "Listed for Trade" : "List for Trade"}
            </button>
            <button
              onClick={toggleSale}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                item.is_for_sale
                  ? "bg-[var(--color-success)] text-white"
                  : "bg-[var(--color-success-subtle)] text-[var(--color-success)]"
              }`}
            >
              <DollarSign className="w-4 h-4" />
              {item.is_for_sale ? "Listed for Sale" : "List for Sale"}
            </button>
            <button
              onClick={() => router.push(`/item/${item.id}/edit`)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
          </div>

          {/* Quick actions row */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowPanel(showPanel === "sell" ? null : "sell")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                showPanel === "sell"
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Sell
            </button>
            <button
              onClick={() => setShowPanel(showPanel === "alert" ? null : "alert")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                showPanel === "alert"
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              <Bell className="w-3.5 h-3.5" /> Price Alert
            </button>
            <button
              onClick={() => setShowPanel(showPanel === "share" ? null : "share")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                showPanel === "share"
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
          </div>

          {/* Expandable panels */}
          {showPanel === "sell" && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
              <ListingCreator item={item} />
            </div>
          )}

          {showPanel === "alert" && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
              <PriceAlertManager
                userId={profile?.id ?? ""}
                itemId={item.id}
                itemTitle={item.title}
                itemCategory={item.category}
                currentPrice={item.estimated_value ?? 0}
              />
            </div>
          )}

          {showPanel === "share" && profile && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
              <ShareCard
                data={{
                  username: profile.username,
                  displayName: profile.display_name ?? profile.username,
                  itemTitle: item.title,
                  itemImage: item.image_urls?.[0],
                  itemValue: item.estimated_value ?? undefined,
                  itemGrade: item.grade_value ?? undefined,
                  gradingCompany: item.grading_company ?? undefined,
                }}
                type="item"
              />
            </div>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--color-bg-elevated)] text-xs text-[var(--color-text-muted)]"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category Attributes + Price Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl bg-[var(--color-bg-surface)] p-6">
          <CategoryAttributes item={item} />
        </div>
        <PriceChart priceHistory={priceHistory} />
      </div>

      {/* Market Momentum (Pro feature) */}
      <UpgradeGate feature="marketMomentum" mode="overlay">
        <MarketMomentum
          items={[{
            id: item.id,
            title: item.title,
            category: item.category,
            estimated_value: item.estimated_value,
          }]}
          category={item.category}
        />
      </UpgradeGate>

      {/* Recent Sales */}
      <RecentSales sales={priceHistory} />
    </div>
  );
}
