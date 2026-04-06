"use client";

import { useState } from "react";
import { Scan, Search, ExternalLink } from "lucide-react";
import BarcodeScanner from "@/components/scan/BarcodeScanner";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface LookupResult {
  title: string;
  category: string;
  brand: string;
  imageUrl?: string;
  estimatedValue?: number;
}

export default function ScanPage() {
  const [barcode, setBarcode] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [searching, setSearching] = useState(false);

  const handleScan = async (code: string) => {
    setBarcode(code);
    setSearching(true);
    setResult(null);

    // TODO: Replace with actual API lookup (eBay, TCGPlayer, etc.)
    // For now, show the barcode and a placeholder
    setTimeout(() => {
      setResult({
        title: `Item #${code}`,
        category: "cards",
        brand: "Unknown",
        estimatedValue: undefined,
      });
      setSearching(false);
    }, 1500);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Scan className="w-6 h-6 text-[var(--color-accent)]" />
          Scan & Identify
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Scan a barcode or UPC to identify and look up collectibles
        </p>
      </div>

      <BarcodeScanner onScan={handleScan} />

      {barcode && (
        <Card className="p-4">
          <p className="text-xs text-[var(--color-text-muted)]">Scanned code</p>
          <p className="text-sm font-mono font-medium mt-1">{barcode}</p>
        </Card>
      )}

      {searching && (
        <Card className="p-6 flex items-center justify-center gap-3">
          <Search className="w-5 h-5 text-[var(--color-accent)] animate-pulse" />
          <span className="text-sm text-[var(--color-text-muted)]">Looking up item...</span>
        </Card>
      )}

      {result && !searching && (
        <Card className="p-5 space-y-4">
          <h3 className="font-semibold">{result.title}</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            {result.brand} · {result.category}
          </p>
          {result.estimatedValue && (
            <p className="text-lg font-bold text-[var(--color-success)]">
              ${result.estimatedValue.toFixed(2)}
            </p>
          )}
          <div className="flex gap-3">
            <Button size="sm">Add to Collection</Button>
            <Button size="sm" variant="secondary">
              <ExternalLink className="w-4 h-4" /> View on eBay
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
