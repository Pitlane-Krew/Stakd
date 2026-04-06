"use client";

import { useState, useRef } from "react";
import {
  Camera,
  Upload,
  FileSpreadsheet,
  Sparkles,
  Check,
  X,
  Plus,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { getCategories } from "@/config/category-registry";

interface DetectedItem {
  name: string;
  category: string;
  year: number | null;
  brand: string | null;
  estimatedValue: number | null;
  condition: string;
  attributes: Record<string, unknown>;
  confidence: number;
  _selected?: boolean;
}

interface Props {
  collectionId: string;
  category?: string;
  onImport: (items: DetectedItem[]) => Promise<void>;
}

type ImportMode = "photo" | "csv" | "manual-batch";

export default function BulkImport({ collectionId, category, onImport }: Props) {
  const [mode, setMode] = useState<ImportMode | null>(null);
  const [items, setItems] = useState<DetectedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);
  const categories = getCategories();

  // ---------------------------------------------------------------
  // Photo Scan
  // ---------------------------------------------------------------
  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => scanPhoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function scanPhoto(dataUrl: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/import/scan-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: dataUrl, category }),
      });
      const data = await res.json();
      if (data.items) {
        setItems(data.items.map((i: DetectedItem) => ({ ...i, _selected: true })));
      } else {
        setError(data.error || "No items detected");
      }
    } catch {
      setError("Failed to scan photo");
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------
  // CSV Import
  // ---------------------------------------------------------------
  function handleCSVSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => parseCSV(reader.result as string);
    reader.readAsText(file);
  }

  async function parseCSV(csvText: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/import/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText, category, collectionId }),
      });
      const data = await res.json();
      if (data.items) {
        setItems(
          data.items.map((i: DetectedItem) => ({
            ...i,
            confidence: i._enriched ? 70 : 90,
            _selected: true,
          }))
        );
      } else {
        setError(data.error || "Failed to parse CSV");
      }
    } catch {
      setError("Failed to import CSV");
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------
  // Manual Batch (quick-add)
  // ---------------------------------------------------------------
  const [batchText, setBatchText] = useState("");

  async function processBatchText() {
    if (!batchText.trim()) return;
    setLoading(true);
    setError(null);

    const apiKey = true; // We call our own API
    try {
      // Send plain text list to AI for parsing
      const res = await fetch("/api/import/scan-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // We'll repurpose the text prompt via a text-only route
          imageUrl: `data:text/plain;base64,${btoa(batchText)}`,
          category,
        }),
      });

      // If photo scan doesn't work for text, parse locally
      const lines = batchText.split("\n").filter((l) => l.trim());
      const parsed: DetectedItem[] = lines.map((line) => ({
        name: line.trim(),
        category: category || "pokemon",
        year: null,
        brand: null,
        estimatedValue: null,
        condition: "raw",
        attributes: {},
        confidence: 50,
        _selected: true,
      }));
      setItems(parsed);
    } catch {
      setError("Failed to process list");
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------
  // Toggle & Import
  // ---------------------------------------------------------------
  function toggleItem(index: number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, _selected: !item._selected } : item
      )
    );
  }

  function selectAll() {
    setItems((prev) => prev.map((item) => ({ ...item, _selected: true })));
  }

  async function handleImport() {
    const selected = items.filter((i) => i._selected);
    if (selected.length === 0) return;
    setImporting(true);
    try {
      await onImport(selected);
      setItems([]);
      setMode(null);
    } catch {
      setError("Import failed");
    } finally {
      setImporting(false);
    }
  }

  // ---------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------

  // Mode selection
  if (!mode) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[var(--color-accent)]" />
          Quick Import
        </h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          Add items fast — snap a photo, upload a spreadsheet, or type a list
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => setMode("photo")}
            className="p-5 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors text-left space-y-2"
          >
            <Camera className="w-8 h-8 text-[var(--color-accent)]" />
            <p className="font-semibold text-sm">Photo Scan</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Snap a photo of cards on a table, a binder page, or a shelf
            </p>
          </button>

          <button
            onClick={() => setMode("csv")}
            className="p-5 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors text-left space-y-2"
          >
            <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
            <p className="font-semibold text-sm">CSV / Spreadsheet</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Upload a CSV or Excel export from another app
            </p>
          </button>

          <button
            onClick={() => setMode("manual-batch")}
            className="p-5 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors text-left space-y-2"
          >
            <Plus className="w-8 h-8 text-amber-400" />
            <p className="font-semibold text-sm">Quick List</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Type or paste item names, one per line
            </p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {mode === "photo" && "Photo Scan"}
          {mode === "csv" && "CSV Import"}
          {mode === "manual-batch" && "Quick List"}
        </h3>
        <button
          onClick={() => { setMode(null); setItems([]); setError(null); }}
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        >
          ← Back
        </button>
      </div>

      {/* Input area */}
      {items.length === 0 && (
        <>
          {mode === "photo" && (
            <div>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} className="hidden" />
              <div
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-[var(--color-border)] cursor-pointer hover:border-[var(--color-accent)] transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-[var(--color-accent)]" />
                ) : (
                  <>
                    <Camera className="w-10 h-10 text-[var(--color-text-muted)] mb-2" />
                    <p className="text-sm font-medium">Take a photo or upload</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Lay cards flat, ensure good lighting
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {mode === "csv" && (
            <div>
              <input ref={csvRef} type="file" accept=".csv,.tsv,.txt" onChange={handleCSVSelect} className="hidden" />
              <div
                onClick={() => csvRef.current?.click()}
                className="flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-[var(--color-border)] cursor-pointer hover:border-[var(--color-accent)] transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-[var(--color-accent)]" />
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-[var(--color-text-muted)] mb-2" />
                    <p className="text-sm font-medium">Upload CSV file</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Columns: name, category, year, condition, value, grade
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {mode === "manual-batch" && (
            <div className="space-y-3">
              <textarea
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder={"Charizard VMAX Shining Fates\nPikachu V-Union\nPatrick Mahomes Prizm RC\n...one item per line"}
                rows={8}
                className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-none font-mono"
              />
              <Button onClick={processBatchText} loading={loading}>
                <Sparkles className="w-4 h-4" /> Process List
              </Button>
            </div>
          )}
        </>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Results review */}
      {items.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--color-text-muted)]">
              {items.filter((i) => i._selected).length} of {items.length} items selected
            </p>
            <button onClick={selectAll} className="text-xs text-[var(--color-accent)]">
              Select all
            </button>
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {items.map((item, i) => (
              <Card
                key={i}
                className={`p-3 flex items-center gap-3 cursor-pointer transition-opacity ${
                  !item._selected ? "opacity-40" : ""
                }`}
                onClick={() => toggleItem(i)}
              >
                <div
                  className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                    item._selected
                      ? "bg-[var(--color-accent)] border-[var(--color-accent)]"
                      : "border-[var(--color-border)]"
                  }`}
                >
                  {item._selected && <Check className="w-3 h-3 text-white" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                    <span className="capitalize">{item.category}</span>
                    {item.year && <span>· {item.year}</span>}
                    {item.condition && <span>· {item.condition}</span>}
                  </div>
                </div>

                {item.estimatedValue && (
                  <span className="text-sm font-semibold text-[var(--color-success)] flex-shrink-0">
                    ${item.estimatedValue.toLocaleString()}
                  </span>
                )}

                <div
                  className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{
                    background:
                      item.confidence >= 80
                        ? "rgba(16,185,129,0.15)"
                        : item.confidence >= 50
                          ? "rgba(251,191,36,0.15)"
                          : "rgba(239,68,68,0.15)",
                    color:
                      item.confidence >= 80
                        ? "#10b981"
                        : item.confidence >= 50
                          ? "#fbbf24"
                          : "#ef4444",
                  }}
                >
                  {item.confidence}%
                </div>
              </Card>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleImport} loading={importing} className="flex-1">
              <Plus className="w-4 h-4" />
              Import {items.filter((i) => i._selected).length} Items
            </Button>
            <Button variant="secondary" onClick={() => setItems([])}>
              <X className="w-4 h-4" /> Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
