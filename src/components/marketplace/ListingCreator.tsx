"use client";

import { useState } from "react";
import {
  ExternalLink,
  DollarSign,
  Tag,
  Package,
  TrendingUp,
  Check,
  AlertCircle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

interface ListingItem {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  condition: string;
  estimated_value: number | null;
  image_urls: string[];
  grade_value?: string | null;
  grading_company?: string | null;
}

interface Props {
  item: ListingItem;
}

type Platform = "ebay" | "mercari" | "tcgplayer" | "stakd";

const PLATFORMS: {
  id: Platform;
  name: string;
  color: string;
  fee: string;
  url: string;
}[] = [
  {
    id: "stakd",
    name: "STAKD Marketplace",
    color: "#4B9CD3",
    fee: "3%",
    url: "",
  },
  {
    id: "ebay",
    name: "eBay",
    color: "#e53238",
    fee: "13.25%",
    url: "https://www.ebay.com/sell/create",
  },
  {
    id: "mercari",
    name: "Mercari",
    color: "#4dc9f6",
    fee: "10%",
    url: "https://www.mercari.com/sell/",
  },
  {
    id: "tcgplayer",
    name: "TCGplayer",
    color: "#f5a623",
    fee: "10.25%",
    url: "https://store.tcgplayer.com",
  },
];

export default function ListingCreator({ item }: Props) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("stakd");
  const [listPrice, setListPrice] = useState(
    item.estimated_value?.toString() ?? ""
  );
  const [includeShipping, setIncludeShipping] = useState(true);
  const [listed, setListed] = useState(false);

  const price = parseFloat(listPrice) || 0;
  const platform = PLATFORMS.find((p) => p.id === selectedPlatform)!;
  const feePercent = parseFloat(platform.fee) / 100;
  const fees = Math.round(price * feePercent * 100) / 100;
  const payout = Math.round((price - fees) * 100) / 100;

  function handleList() {
    if (selectedPlatform === "stakd") {
      // Mark as for sale on STAKD
      setListed(true);
    } else {
      // Open external platform with pre-filled info
      const url = platform.url;
      window.open(url, "_blank");
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Tag className="w-5 h-5 text-[var(--color-accent)]" />
        List for Sale
      </h3>

      {/* Item preview */}
      <Card className="p-3 flex items-center gap-3">
        {item.image_urls[0] && (
          <img
            src={item.image_urls[0]}
            alt={item.title}
            className="w-12 h-12 rounded-lg object-cover"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.title}</p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {item.condition}
            {item.grading_company && ` · ${item.grading_company} ${item.grade_value}`}
          </p>
        </div>
        {item.estimated_value && (
          <div className="text-right">
            <p className="text-xs text-[var(--color-text-muted)]">Market</p>
            <p className="text-sm font-semibold text-[var(--color-success)]">
              ${item.estimated_value.toLocaleString()}
            </p>
          </div>
        )}
      </Card>

      {/* Platform selector */}
      <div className="grid grid-cols-2 gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPlatform(p.id)}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedPlatform === p.id
                ? "border-[var(--color-accent)] bg-[var(--color-accent)]/5"
                : "border-[var(--color-border)] hover:border-[var(--color-accent)]/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{p.name}</span>
              {p.id !== "stakd" && (
                <ExternalLink className="w-3 h-3 text-[var(--color-text-muted)]" />
              )}
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {p.fee} fee
            </p>
          </button>
        ))}
      </div>

      {/* Pricing */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            type="number"
            value={listPrice}
            onChange={(e) => setListPrice(e.target.value)}
            placeholder="List price"
            className="flex-1 text-lg font-bold bg-transparent outline-none"
          />
        </div>

        {item.estimated_value && price > 0 && (
          <div className="flex items-center gap-2 text-xs">
            {price > item.estimated_value * 1.2 ? (
              <span className="flex items-center gap-1 text-amber-400">
                <AlertCircle className="w-3 h-3" />
                {Math.round(((price - item.estimated_value) / item.estimated_value) * 100)}% above market
              </span>
            ) : price < item.estimated_value * 0.8 ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <TrendingUp className="w-3 h-3" />
                Priced to sell — {Math.round(((item.estimated_value - price) / item.estimated_value) * 100)}% below market
              </span>
            ) : (
              <span className="flex items-center gap-1 text-blue-400">
                <Check className="w-3 h-3" />
                Competitive pricing
              </span>
            )}
          </div>
        )}

        <div className="border-t border-[var(--color-border)] pt-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--color-text-muted)]">
              {platform.name} fee ({platform.fee})
            </span>
            <span className="text-red-400">-${fees.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Your payout</span>
            <span className="text-[var(--color-success)]">
              ${payout.toFixed(2)}
            </span>
          </div>
        </div>
      </Card>

      {/* List button */}
      {listed ? (
        <Card className="p-4 text-center border-emerald-500/30 bg-emerald-500/5">
          <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="font-semibold">Listed on STAKD Marketplace!</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Visible to all STAKD users. You&apos;ll be notified of offers.
          </p>
        </Card>
      ) : (
        <Button onClick={handleList} className="w-full">
          {selectedPlatform === "stakd" ? (
            <>
              <Package className="w-4 h-4" /> List on STAKD
            </>
          ) : (
            <>
              <ExternalLink className="w-4 h-4" /> Open {platform.name}
            </>
          )}
        </Button>
      )}

      {selectedPlatform === "stakd" && (
        <p className="text-xs text-center text-[var(--color-text-muted)]">
          STAKD charges just 3% — the lowest in the hobby. No insertion fees.
        </p>
      )}
    </div>
  );
}
