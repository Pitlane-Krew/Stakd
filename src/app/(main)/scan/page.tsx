"use client";

import { useState } from "react";
import { Scan, Search, ExternalLink, Camera, AlertCircle } from "lucide-react";
import BarcodeScanner from "@/components/scan/BarcodeScanner";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface LookupResult {
  title: string;
  category: string;
  brand: string;
  imageUrl?: string;
  estimatedValue?: number;
  found?: boolean;
}

interface PhotoResult {
  name: string;
  category: string;
  year: number | null;
  brand: string | null;
  estimatedValue: number | null;
  condition: string;
  confidence: number;
}


export default function ScanPage() {
  const [barcode, setBarcode] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [photoResults, setPhotoResults] = useState<PhotoResult[]>([]);
  const [photoSearching, setPhotoSearching] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const handleScan = async (code: string) => {
    setBarcode(code);
    setSearching(true);
    setResult(null);

    try {
      const res = await fetch(`/api/lookup/barcode?code=${encodeURIComponent(code)}`);
      if (res.ok) {
        const data = await res.json();
        setResult({
          title: data.title,
          category: data.category || "general",
          brand: data.brand || "Unknown",
          imageUrl: data.imageUrl,
          estimatedValue: undefined,
          found: data.found,
        });
      } else {
        setResult({
          title: `Item #${code}`,
          category: "general",
          brand: "Unknown",
          found: false,
        });
      }
    } catch {
      setResult({
        title: `Item #${code}`,
        category: "general",
        brand: "Unknown",
        found: false,
      });
    } finally {
      setSearching(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    setPhotoSearching(true);
    setPhotoError(null);
    setPhotoResults([]);

    try {
      // Upload to temporary storage first
      const formData = new FormData();
      formData.append("file", file);

      // For now, create a local data URL (in production, upload to Supabase)
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;

        try {
          const res = await fetch("/api/import/scan-photo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl: dataUrl }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.items && Array.isArray(data.items)) {
              setPhotoResults(data.items);
            }
          } else {
            const errorData = await res.json();
            setPhotoError(errorData.error || "Failed to analyze photo");
          }
        } catch (err) {
          setPhotoError("Failed to process photo. Please try again.");
          console.error("Photo upload error:", err);
        } finally {
          setPhotoSearching(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setPhotoError("Failed to read file");
      setPhotoSearching(false);
    }
  };

  return (
    <div className="lg:max-w-lg lg:mx-auto space-y-6">
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
        <Card className={`p-5 space-y-4 ${!result.found ? "border border-yellow-500/50 bg-yellow-500/5" : ""}`}>
          {result.imageUrl && (
            <img src={result.imageUrl} alt={result.title} className="w-full h-48 object-cover rounded-lg" />
          )}
          <div>
            <h3 className="font-semibold">{result.title}</h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              {result.brand} · {result.category}
            </p>
          </div>
          {result.estimatedValue && (
            <p className="text-lg font-bold text-[var(--color-success)]">
              ${result.estimatedValue.toFixed(2)}
            </p>
          )}
          {!result.found && (
            <p className="text-xs text-yellow-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Not found in barcode database
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

      {/* Photo AI Section */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--color-border)]" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 bg-[var(--color-bg)] text-xs text-[var(--color-text-muted)]">or</span>
        </div>
      </div>

      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-semibold">AI Photo Identification</h3>
        <p className="text-xs text-[var(--color-text-muted)]">
          Upload a photo of your collectible and AI will identify it
        </p>
        <label className="block">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoUpload}
          />
          <div className="border-2 border-dashed border-[var(--color-border)] rounded-xl p-8 text-center cursor-pointer hover:border-[var(--color-accent)] transition-colors">
            <Camera className="w-8 h-8 mx-auto text-[var(--color-text-muted)] mb-2" />
            <p className="text-sm text-[var(--color-text-muted)]">
              Tap to take photo or upload image
            </p>
          </div>
        </label>
      </Card>

      {photoSearching && (
        <Card className="p-6 flex items-center justify-center gap-3">
          <Search className="w-5 h-5 text-[var(--color-accent)] animate-pulse" />
          <span className="text-sm text-[var(--color-text-muted)]">Analyzing photo...</span>
        </Card>
      )}

      {photoError && (
        <Card className="p-4 border border-red-500/50 bg-red-500/5">
          <p className="text-sm text-red-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {photoError}
          </p>
        </Card>
      )}

      {photoResults.length > 0 && !photoSearching && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Identified Items</h3>
          {photoResults.map((item, i) => (
            <Card key={i} className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {item.brand} · {item.category}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[var(--color-text-muted)]">Confidence</p>
                  <p className="font-semibold text-sm">{item.confidence}%</p>
                </div>
              </div>
              {item.year && (
                <p className="text-xs text-[var(--color-text-muted)]">Year: {item.year}</p>
              )}
              {item.estimatedValue && (
                <p className="text-sm font-bold text-[var(--color-success)]">
                  ${item.estimatedValue.toFixed(2)}
                </p>
              )}
              <p className="text-xs text-[var(--color-text-muted)]">Condition: {item.condition}</p>
              <Button size="sm" className="w-full mt-2">Add to Collection</Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
