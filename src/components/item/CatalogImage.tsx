"use client";

import { useState, useEffect } from "react";
import { Package, Sparkles, Trophy, Car, Ghost, Footprints, Flag } from "lucide-react";
import { getCatalogImage, hasCatalogImageSupport } from "@/services/catalog-images";

// ─── Category icon + color mapping ─────────────────────────────

const CATEGORY_STYLES: Record<string, { icon: typeof Package; color: string; bg: string }> = {
  pokemon:      { icon: Sparkles,   color: "#FBBF24", bg: "from-amber-900/40 to-amber-950/60" },
  sports_cards: { icon: Trophy,     color: "#3B82F6", bg: "from-blue-900/40 to-blue-950/60" },
  hot_wheels:   { icon: Car,        color: "#EF4444", bg: "from-red-900/40 to-red-950/60" },
  figures:      { icon: Ghost,      color: "#8B5CF6", bg: "from-violet-900/40 to-violet-950/60" },
  sneakers:     { icon: Footprints, color: "#F97316", bg: "from-orange-900/40 to-orange-950/60" },
  formula_one:  { icon: Flag,       color: "#E10600", bg: "from-red-900/40 to-red-950/60" },
};

// ─── Styled Placeholder Card ────────────────────────────────────

function PlaceholderCard({
  title,
  category,
  subtitle,
  className = "",
}: {
  title: string;
  category: string;
  subtitle?: string;
  className?: string;
}) {
  const style = CATEGORY_STYLES[category] ?? CATEGORY_STYLES.pokemon;
  const Icon = style.icon;

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${style.bg} border border-white/10 flex flex-col items-center justify-center text-center p-4 ${className}`}
    >
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-2 left-2 w-8 h-8 border border-white/20 rounded-full" />
        <div className="absolute bottom-3 right-3 w-12 h-12 border border-white/20 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border border-white/10 rounded-full" />
      </div>

      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
        style={{ backgroundColor: `${style.color}20` }}
      >
        <Icon className="w-6 h-6" style={{ color: style.color }} />
      </div>

      <p className="text-sm font-bold text-white/90 line-clamp-2 leading-tight max-w-[90%]">
        {title}
      </p>

      {subtitle && (
        <p className="text-[11px] text-white/50 mt-1 line-clamp-1">
          {subtitle}
        </p>
      )}

      <div
        className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
        style={{ backgroundColor: `${style.color}30`, color: style.color }}
      >
        STAKD
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

interface CatalogImageProps {
  /** User's uploaded images (takes priority) */
  imageUrls: string[];
  /** Item title / name */
  title: string;
  /** Category ID from registry */
  category: string;
  /** Category-specific attributes for API lookup */
  attributes?: Record<string, unknown>;
  /** CSS class for sizing */
  className?: string;
  /** Aspect ratio class (default: aspect-[3/4] for card shape) */
  aspectClass?: string;
}

export default function CatalogImage({
  imageUrls,
  title,
  category,
  attributes = {},
  className = "",
  aspectClass = "aspect-[3/4]",
}: CatalogImageProps) {
  const [catalogUrl, setCatalogUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tried, setTried] = useState(false);

  // If user uploaded photos, always use those
  const hasUserImage = imageUrls && imageUrls.length > 0;

  useEffect(() => {
    if (hasUserImage || tried || !hasCatalogImageSupport(category)) return;

    let cancelled = false;
    setLoading(true);

    getCatalogImage(category, title, attributes)
      .then((result) => {
        if (!cancelled && result.imageUrl) {
          setCatalogUrl(result.imageUrl);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setTried(true);
        }
      });

    return () => { cancelled = true; };
  }, [category, title, attributes, hasUserImage, tried]);

  // Priority: User photo → Catalog image → Styled placeholder
  const displayUrl = hasUserImage ? imageUrls[0] : catalogUrl;

  if (displayUrl) {
    return (
      <div className={`relative overflow-hidden rounded-xl ${aspectClass} ${className}`}>
        <img
          src={displayUrl}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Source badge for catalog images */}
        {!hasUserImage && catalogUrl && (
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[9px] text-white/70 font-medium">
            Catalog
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>
    );
  }

  // Styled placeholder
  return (
    <PlaceholderCard
      title={title}
      category={category}
      subtitle={(attributes.set_name as string) || (attributes.player_name as string) || (attributes.model_name as string) || undefined}
      className={`${aspectClass} ${className}`}
    />
  );
}
