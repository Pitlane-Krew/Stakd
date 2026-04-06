"use client";

import { useState, useRef } from "react";
import {
  Download,
  Copy,
  Check,
  ExternalLink,
  Instagram,
  Share2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

interface ShareCardData {
  username: string;
  displayName: string;
  itemTitle?: string;
  itemImage?: string;
  itemValue?: number;
  itemGrade?: string;
  gradingCompany?: string;
  collectionName?: string;
  totalItems?: number;
  totalValue?: number;
}

interface Props {
  data: ShareCardData;
  type: "item" | "collection" | "milestone";
  milestoneText?: string;
}

export default function ShareCard({ data, type, milestoneText }: Props) {
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  function copyLink() {
    const url = `${window.location.origin}/u/${data.username}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function downloadCard() {
    if (!cardRef.current) return;
    // Use html2canvas if available, otherwise fallback
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#09090b",
        scale: 2,
      });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `stakd-${data.username}-${type}.png`;
      a.click();
    } catch {
      // Fallback: just copy the link
      copyLink();
    }
  }

  return (
    <div className="space-y-4">
      {/* Preview card */}
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-[#0f0f17] via-[#1a1a2e] to-[#16213e]"
        style={{ maxWidth: 480 }}
      >
        {/* Subtle pattern overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative z-10 space-y-4">
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-purple-400 tracking-wider">
              STAKD
            </span>
            <span className="text-xs text-gray-500">
              stakd.app/u/{data.username}
            </span>
          </div>

          {/* Content varies by type */}
          {type === "item" && (
            <div className="space-y-3">
              {data.itemImage && (
                <img
                  src={data.itemImage}
                  alt={data.itemTitle}
                  className="w-full h-48 object-contain rounded-lg"
                />
              )}
              <div>
                <h3 className="text-xl font-bold text-white">
                  {data.itemTitle}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  {data.itemGrade && (
                    <span className="text-sm font-semibold text-amber-400">
                      {data.gradingCompany} {data.itemGrade}
                    </span>
                  )}
                  {data.itemValue && (
                    <span className="text-sm font-semibold text-emerald-400">
                      ${data.itemValue.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {type === "collection" && (
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-white">
                {data.collectionName}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-white">
                    {data.totalItems?.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">Items</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-400">
                    ${data.totalValue?.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">Value</p>
                </div>
              </div>
            </div>
          )}

          {type === "milestone" && (
            <div className="text-center py-4">
              <p className="text-4xl">🏆</p>
              <h3 className="text-xl font-bold text-white mt-2">
                {milestoneText}
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                {data.totalItems?.toLocaleString()} items · $
                {data.totalValue?.toLocaleString()} value
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center gap-2 pt-2 border-t border-white/10">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white">
              {data.displayName[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {data.displayName}
              </p>
              <p className="text-xs text-gray-500">@{data.username}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Share actions */}
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={downloadCard}>
          <Download className="w-3.5 h-3.5" /> Save Image
        </Button>
        <Button size="sm" variant="secondary" onClick={copyLink}>
          {copied ? (
            <><Check className="w-3.5 h-3.5" /> Copied!</>
          ) : (
            <><Copy className="w-3.5 h-3.5" /> Copy Link</>
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            const url = `${window.location.origin}/u/${data.username}`;
            window.open(
              `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                `Check out my collection on STAKD 🔥`
              )}&url=${encodeURIComponent(url)}`,
              "_blank"
            );
          }}
        >
          <ExternalLink className="w-3.5 h-3.5" /> Post
        </Button>
      </div>
    </div>
  );
}
