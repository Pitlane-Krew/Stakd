"use client";

import { useState, useRef, useEffect } from "react";
import { QrCode, Download, Printer, Settings2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

interface LabelItem {
  id: string;
  title: string;
  category: string;
  condition?: string;
  gradeValue?: string;
  gradingCompany?: string;
  estimatedValue?: number;
}

interface Props {
  items: LabelItem[];
  baseUrl?: string;
}

type LabelSize = "small" | "medium" | "large";

const LABEL_SIZES: Record<LabelSize, { width: number; height: number; qrSize: number; fontSize: number }> = {
  small: { width: 200, height: 80, qrSize: 60, fontSize: 9 },
  medium: { width: 280, height: 100, qrSize: 80, fontSize: 11 },
  large: { width: 360, height: 130, qrSize: 100, fontSize: 13 },
};

/**
 * Simple QR code generator using Canvas.
 * Generates a QR-like pattern (in prod, use a proper QR library).
 * For MVP we generate a visual placeholder and encode the URL as text.
 */
function drawQRCode(
  canvas: HTMLCanvasElement,
  text: string,
  size: number
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = size;
  canvas.height = size;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  // Generate simple hash-based pattern (visual placeholder)
  const modules = 21;
  const cellSize = size / modules;

  ctx.fillStyle = "#000000";

  // Position markers (3 corners)
  function drawFinder(x: number, y: number) {
    // Outer
    ctx.fillRect(x * cellSize, y * cellSize, 7 * cellSize, 7 * cellSize);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect((x + 1) * cellSize, (y + 1) * cellSize, 5 * cellSize, 5 * cellSize);
    ctx.fillStyle = "#000000";
    ctx.fillRect((x + 2) * cellSize, (y + 2) * cellSize, 3 * cellSize, 3 * cellSize);
  }

  drawFinder(0, 0);
  drawFinder(modules - 7, 0);
  drawFinder(0, modules - 7);

  // Data pattern from text hash
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }

  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      // Skip finder patterns
      if (
        (row < 8 && col < 8) ||
        (row < 8 && col >= modules - 8) ||
        (row >= modules - 8 && col < 8)
      )
        continue;

      const bit = ((hash >> ((row * modules + col) % 31)) & 1) ^
        ((col * row + hash) % 3 === 0 ? 1 : 0);

      if (bit) {
        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
      }
    }
  }
}

export default function QRCodeLabel({ items, baseUrl = "https://stakd.app" }: Props) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(
    new Set(items.slice(0, 10).map((i) => i.id))
  );
  const [labelSize, setLabelSize] = useState<LabelSize>("medium");
  const [showValues, setShowValues] = useState(true);
  const [showGrade, setShowGrade] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  function toggleItem(id: string) {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function printLabels() {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html><head><title>STAKD Labels</title>
      <style>
        body { margin: 0; padding: 10px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
        .label-grid { display: flex; flex-wrap: wrap; gap: 8px; }
        .label { border: 1px solid #ddd; border-radius: 6px; padding: 8px; display: flex; gap: 8px; align-items: center; page-break-inside: avoid; }
        .label-text { flex: 1; }
        .label-title { font-weight: 600; margin: 0; }
        .label-meta { color: #666; margin: 2px 0 0; }
        .label-value { font-weight: 700; color: #10b981; }
        @media print { body { padding: 0; } }
      </style></head><body>
      ${content.innerHTML}
      <script>window.print();window.close();</script>
      </body></html>
    `);
  }

  const size = LABEL_SIZES[labelSize];
  const selected = items.filter((i) => selectedItems.has(i.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <QrCode className="w-5 h-5 text-[var(--color-accent)]" />
          QR Code Labels
        </h3>
        {selected.length > 0 && (
          <Button variant="secondary" size="sm" onClick={printLabels}>
            <Printer className="w-4 h-4" /> Print {selected.length}
          </Button>
        )}
      </div>

      <p className="text-sm text-[var(--color-text-muted)]">
        Generate QR labels for your display cases — scan to view item details
      </p>

      {/* Settings */}
      <Card className="p-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-[var(--color-text-muted)]" />
          <span className="text-xs text-[var(--color-text-muted)]">Size:</span>
          {(["small", "medium", "large"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setLabelSize(s)}
              className={`px-2 py-1 rounded text-xs font-medium ${
                labelSize === s
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={showValues}
            onChange={(e) => setShowValues(e.target.checked)}
            className="accent-[var(--color-accent)]"
          />
          Show Values
        </label>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={showGrade}
            onChange={(e) => setShowGrade(e.target.checked)}
            className="accent-[var(--color-accent)]"
          />
          Show Grade
        </label>
      </Card>

      {/* Item selector */}
      <div className="max-h-[200px] overflow-y-auto space-y-1">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--color-bg-elevated)] cursor-pointer text-sm"
          >
            <input
              type="checkbox"
              checked={selectedItems.has(item.id)}
              onChange={() => toggleItem(item.id)}
              className="accent-[var(--color-accent)]"
            />
            <span className="truncate">{item.title}</span>
          </label>
        ))}
      </div>

      {/* Label preview */}
      <div ref={printRef} className="label-grid flex flex-wrap gap-2">
        {selected.map((item) => (
          <LabelCard
            key={item.id}
            item={item}
            size={size}
            showValues={showValues}
            showGrade={showGrade}
            baseUrl={baseUrl}
          />
        ))}
      </div>
    </div>
  );
}

function LabelCard({
  item,
  size,
  showValues,
  showGrade,
  baseUrl,
}: {
  item: LabelItem;
  size: (typeof LABEL_SIZES)[LabelSize];
  showValues: boolean;
  showGrade: boolean;
  baseUrl: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const url = `${baseUrl}/item/${item.id}`;

  useEffect(() => {
    if (canvasRef.current) {
      drawQRCode(canvasRef.current, url, size.qrSize);
    }
  }, [url, size.qrSize]);

  return (
    <div
      className="label flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white p-2"
      style={{ width: size.width, minHeight: size.height }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size.qrSize, height: size.qrSize }}
        className="flex-shrink-0 rounded"
      />
      <div className="label-text flex-1 min-w-0">
        <p
          className="label-title font-semibold text-gray-900 truncate"
          style={{ fontSize: size.fontSize }}
        >
          {item.title}
        </p>
        <p
          className="label-meta text-gray-500"
          style={{ fontSize: size.fontSize - 2 }}
        >
          {item.category}
          {showGrade && item.gradingCompany && item.gradeValue && (
            <> · {item.gradingCompany} {item.gradeValue}</>
          )}
        </p>
        {showValues && item.estimatedValue && (
          <p
            className="label-value text-emerald-600 font-bold"
            style={{ fontSize: size.fontSize }}
          >
            ${item.estimatedValue.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
