"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  sourceId: string;
  sourceName: string;
  isEnabled: boolean;
}

export default function PriceSourceToggle({ sourceId, sourceName, isEnabled }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(isEnabled);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    setEnabled(!enabled);
    await fetch(`/api/admin/pricing/${sourceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_enabled: !enabled }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? "bg-[var(--color-accent)]" : "bg-white/20"
      } ${loading ? "opacity-50" : ""}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}
