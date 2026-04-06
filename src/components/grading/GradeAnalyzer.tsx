"use client";

import { useState, useRef } from "react";
import { Camera, Upload, Sparkles, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

interface SubGrades {
  centering: number;
  corners: number;
  edges: number;
  surface: number;
}

interface GradingResult {
  estimatedGrade: number;
  confidence: number;
  subgrades: SubGrades;
  defects: string[];
  recommendation: "worth_grading" | "borderline" | "not_worth_grading";
  analysis: string;
}

interface Props {
  category?: string;
  itemId?: string;
  onResult?: (result: GradingResult) => void;
}

export default function GradeAnalyzer({ category, itemId, onResult }: Props) {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<GradingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  async function analyzeGrade() {
    if (!image) return;
    setAnalyzing(true);
    setError(null);

    try {
      // For the prototype, we send the data URL directly
      // In production, upload to Supabase Storage first
      const res = await fetch("/api/grading/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: image,
          category,
          itemId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }

      const data = await res.json();
      setResult(data);
      onResult?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  function getGradeColor(grade: number): string {
    if (grade >= 9) return "text-emerald-400";
    if (grade >= 7) return "text-blue-400";
    if (grade >= 5) return "text-amber-400";
    return "text-red-400";
  }

  function getRecIcon(rec: string) {
    switch (rec) {
      case "worth_grading":
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case "borderline":
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      default:
        return <XCircle className="w-5 h-5 text-red-400" />;
    }
  }

  function getRecLabel(rec: string): string {
    switch (rec) {
      case "worth_grading":
        return "Worth Grading";
      case "borderline":
        return "Borderline — Consider Carefully";
      default:
        return "Not Worth Grading";
    }
  }

  function getRecBg(rec: string): string {
    switch (rec) {
      case "worth_grading":
        return "bg-emerald-400/10 border-emerald-400/30";
      case "borderline":
        return "bg-amber-400/10 border-amber-400/30";
      default:
        return "bg-red-400/10 border-red-400/30";
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-[var(--color-accent)]" />
          <h3 className="text-lg font-semibold">AI Grade Analyzer</h3>
        </div>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          Upload a clear photo of your collectible and our AI will estimate the
          grade and tell you if it's worth sending for professional grading.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {!image ? (
          <div
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center h-64 rounded-xl border-2 border-dashed border-[var(--color-border)] cursor-pointer hover:border-[var(--color-accent)] transition-colors"
          >
            <Camera className="w-10 h-10 text-[var(--color-text-muted)] mb-3" />
            <p className="text-sm font-medium">Take a photo or upload an image</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Best results with well-lit, flat images showing the full card
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden max-h-80 flex items-center justify-center bg-black">
              <img
                src={image}
                alt="Card to analyze"
                className="max-h-80 object-contain"
              />
              <button
                onClick={() => {
                  setImage(null);
                  setResult(null);
                }}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-3">
              <Button onClick={analyzeGrade} loading={analyzing} className="flex-1">
                <Sparkles className="w-4 h-4" />
                {analyzing ? "Analyzing..." : "Analyze Grade"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-4 h-4" /> New Photo
              </Button>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-400 mt-3">{error}</p>
        )}
      </Card>

      {/* Results Section */}
      {result && (
        <>
          {/* Main Grade */}
          <Card className="p-6 text-center">
            <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wider mb-1">
              Estimated Grade
            </p>
            <p className={`text-6xl font-bold ${getGradeColor(result.estimatedGrade)}`}>
              {result.estimatedGrade.toFixed(1)}
            </p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              {result.confidence}% confidence
            </p>

            {/* Confidence bar */}
            <div className="mt-3 h-2 rounded-full bg-[var(--color-bg-elevated)] overflow-hidden max-w-xs mx-auto">
              <div
                className="h-full rounded-full bg-[var(--color-accent)] transition-all"
                style={{ width: `${result.confidence}%` }}
              />
            </div>
          </Card>

          {/* Subgrades */}
          <Card className="p-6">
            <h4 className="text-sm font-semibold mb-4">Subgrades</h4>
            <div className="grid grid-cols-2 gap-4">
              {(
                Object.entries(result.subgrades) as [
                  keyof SubGrades,
                  number,
                ][]
              ).map(([key, value]) => (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-[var(--color-text-secondary)]">
                      {key}
                    </span>
                    <span className={`font-semibold ${getGradeColor(value)}`}>
                      {value.toFixed(1)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--color-bg-elevated)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(value / 10) * 100}%`,
                        background:
                          value >= 9
                            ? "#10b981"
                            : value >= 7
                              ? "#3b82f6"
                              : value >= 5
                                ? "#fbbf24"
                                : "#ef4444",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recommendation */}
          <Card
            className={`p-5 border ${getRecBg(result.recommendation)}`}
          >
            <div className="flex items-center gap-3">
              {getRecIcon(result.recommendation)}
              <div>
                <p className="font-semibold text-sm">
                  {getRecLabel(result.recommendation)}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  {result.analysis}
                </p>
              </div>
            </div>
          </Card>

          {/* Defects */}
          {result.defects.length > 0 && (
            <Card className="p-5">
              <h4 className="text-sm font-semibold mb-3">Detected Issues</h4>
              <ul className="space-y-1.5">
                {result.defects.map((defect, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]"
                  >
                    <span className="text-amber-400 mt-0.5">•</span>
                    {defect}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
