"use client";

import { Sparkles } from "lucide-react";
import GradeAnalyzer from "@/components/grading/GradeAnalyzer";

export default function GradingPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-[var(--color-accent)]" />
          AI Grade Analyzer
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Get an instant AI-powered grade estimate before sending to PSA, BGS, or CGC
        </p>
      </div>

      <GradeAnalyzer />

      {/* Info section */}
      <div className="rounded-xl bg-[var(--color-bg-surface)] p-5 space-y-3">
        <h3 className="text-sm font-semibold">How it works</h3>
        <div className="space-y-2 text-sm text-[var(--color-text-secondary)]">
          <p>
            Our AI analyzes centering, corners, edges, and surface quality using
            the same criteria professional graders use.
          </p>
          <p>
            Take a clear, well-lit photo of your card on a flat surface. The
            camera should be directly above the card to minimize distortion.
          </p>
          <p>
            The grade estimate includes a confidence score — higher confidence
            means clearer image and more definitive features.
          </p>
        </div>

        <h3 className="text-sm font-semibold pt-2">Tips for best results</h3>
        <ul className="text-sm text-[var(--color-text-secondary)] space-y-1">
          <li>• Use natural or bright, even lighting</li>
          <li>• Place card on a dark, non-reflective surface</li>
          <li>• Include the full card with borders visible</li>
          <li>• Avoid glare on holographic surfaces</li>
          <li>• Take separate front and back photos for best accuracy</li>
        </ul>
      </div>
    </div>
  );
}
