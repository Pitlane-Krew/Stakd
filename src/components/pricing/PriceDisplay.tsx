"use client";

import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Clock } from "lucide-react";
import { usePriceUpdates } from "@/hooks/usePriceUpdates";
import { getConditionMultiplier } from "@/services/pricing";

interface PriceDisplayProps {
  /** Item ID to fetch prices for */
  itemId: string;
  /** Retail price (fallback if realtime not available) */
  retailPrice?: number | null;
  /** Resell price (fallback if realtime not available) */
  resellPrice?: number | null;
  /** Current condition selector */
  condition?: string;
  /** Callback when condition changes */
  onConditionChange?: (condition: string) => void;
  /** Show compact version (single line) or full */
  mode?: "compact" | "full";
  /** Show sparkline chart */
  showChart?: boolean;
  /** Custom CSS class */
  className?: string;
}

const CONDITIONS = [
  { value: "raw", label: "Raw" },
  { value: "near_mint", label: "Near Mint" },
  { value: "nm_mt", label: "NM/MT" },
  { value: "excellent", label: "Excellent" },
  { value: "very_good", label: "Very Good" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
];

/**
 * Price Display Component
 *
 * Shows retail value, resell value, and spread for collectibles.
 * Supports condition selection, price movement indicators,
 * and 7-day trend sparkline.
 */
export default function PriceDisplay({
  itemId,
  retailPrice: fallbackRetail,
  resellPrice: fallbackResell,
  condition = "raw",
  onConditionChange,
  mode = "full",
  showChart = true,
  className = "",
}: PriceDisplayProps) {
  const { price, history, loading, error, priceChange, percentChange } = usePriceUpdates(itemId);
  const [selectedCondition, setSelectedCondition] = useState(condition);

  // Apply condition multiplier to prices
  const conditionMult = getConditionMultiplier(selectedCondition);

  const currentRetailPrice = price?.avgPrice
    ? price.avgPrice * conditionMult
    : fallbackRetail
      ? fallbackRetail * conditionMult
      : null;

  const currentResellPrice = price?.minPrice
    ? price.minPrice * conditionMult
    : fallbackResell
      ? fallbackResell * conditionMult
      : null;

  // Calculate spread percentage
  const spreadPercent = currentRetailPrice && currentResellPrice
    ? ((currentResellPrice / currentRetailPrice) * 100).toFixed(0)
    : null;

  // Price movement indicator
  const movementIcon = priceChange === null
    ? null
    : priceChange > 0
      ? <TrendingUp className="w-4 h-4 text-green-500" />
      : priceChange < 0
        ? <TrendingDown className="w-4 h-4 text-red-500" />
        : <Minus className="w-4 h-4 text-gray-400" />;

  // Handle condition change
  const handleConditionChange = (newCondition: string) => {
    setSelectedCondition(newCondition);
    onConditionChange?.(newCondition);
  };

  // Sparkline data (simplified 7-day view)
  const sparklineData = useMemo(() => {
    if (history.length < 2) return null;

    const prices = history.map((h) => h.avgPrice).filter((p): p is number => p !== null);
    if (prices.length < 2) return null;

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    return prices.map((p) => ((p - min) / range) * 100);
  }, [history]);

  // Compact mode
  if (mode === "compact") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {currentRetailPrice && (
          <>
            <div>
              <div className="text-sm text-gray-600">Retail</div>
              <div className="text-lg font-semibold text-gray-900">
                ${currentRetailPrice.toFixed(2)}
              </div>
            </div>
            {currentResellPrice && (
              <>
                <div className="text-gray-300">→</div>
                <div>
                  <div className="text-sm text-gray-600">Resell</div>
                  <div className="text-lg font-semibold text-blue-600">
                    ${currentResellPrice.toFixed(2)}
                  </div>
                </div>
              </>
            )}
          </>
        )}
        {error && <div className="text-xs text-red-500">{error}</div>}
        {!currentRetailPrice && !loading && (
          <div className="text-sm text-gray-500">No pricing data</div>
        )}
        {loading && (
          <div className="animate-pulse h-6 w-24 bg-gray-200 rounded" />
        )}
      </div>
    );
  }

  // Full mode
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Condition Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Condition</label>
        <div className="grid grid-cols-4 gap-2">
          {CONDITIONS.map((cond) => (
            <button
              key={cond.value}
              onClick={() => handleConditionChange(cond.value)}
              className={`px-2 py-1 text-xs rounded transition ${
                selectedCondition === cond.value
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {cond.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Retail Value */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Retail Value</div>
          {currentRetailPrice ? (
            <>
              <div className="text-2xl font-bold text-gray-900">
                ${currentRetailPrice.toFixed(2)}
              </div>
              {conditionMult !== 1.0 && (
                <div className="text-xs text-gray-500 mt-1">
                  × {conditionMult.toFixed(2)} multiplier
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-gray-400">N/A</div>
          )}
        </div>

        {/* Resell Value */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Resell Value</div>
          {currentResellPrice ? (
            <>
              <div className="text-2xl font-bold text-blue-600">
                ${currentResellPrice.toFixed(2)}
              </div>
              {spreadPercent && (
                <div className="text-xs text-gray-500 mt-1">
                  {spreadPercent}% of retail
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-gray-400">N/A</div>
          )}
        </div>
      </div>

      {/* Spread Analysis */}
      {currentRetailPrice && currentResellPrice && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-600">Buy-Sell Spread</div>
              <div className="text-sm font-semibold text-gray-900">
                ${(currentRetailPrice - currentResellPrice).toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-600">Spread %</div>
              <div className="text-sm font-semibold text-blue-600">
                {((1 - (currentResellPrice / currentRetailPrice)) * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Price Movement */}
      {history.length > 1 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            {movementIcon}
            <div className="text-sm font-medium text-gray-900">7-Day Movement</div>
          </div>

          <div className="space-y-2">
            {priceChange !== null && (
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-gray-600">Price Change</span>
                <span className={`text-sm font-semibold ${
                  priceChange > 0 ? "text-green-600" : priceChange < 0 ? "text-red-600" : "text-gray-600"
                }`}>
                  {priceChange > 0 ? "+" : ""}{priceChange.toFixed(2)}
                </span>
              </div>
            )}

            {percentChange !== null && (
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-gray-600">% Change</span>
                <span className={`text-sm font-semibold ${
                  percentChange > 0 ? "text-green-600" : percentChange < 0 ? "text-red-600" : "text-gray-600"
                }`}>
                  {percentChange > 0 ? "+" : ""}{percentChange.toFixed(1)}%
                </span>
              </div>
            )}

            {/* Sparkline Chart */}
            {showChart && sparklineData && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-end gap-1 h-12">
                  {sparklineData.map((height, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-blue-300 rounded-t opacity-70 hover:opacity-100 transition"
                      style={{ height: `${Math.max(20, height)}%` }}
                      title={`Day ${i + 1}: $${history[i].avgPrice?.toFixed(2)}`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>7d ago</span>
                  <span>Today</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Last Updated */}
      {price && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>
            Last updated{" "}
            {new Date(price.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-gray-600 mt-2">Loading price data...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* No Data State */}
      {!loading && !currentRetailPrice && !error && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600 text-center">
          No pricing data available for this item.
        </div>
      )}
    </div>
  );
}
