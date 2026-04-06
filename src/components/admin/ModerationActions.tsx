"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  reportId: string;
  targetType: string;
  targetId: string;
}

export default function ModerationActions({ reportId, targetType, targetId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function action(status: "actioned" | "dismissed") {
    setLoading(true);
    await fetch(`/api/admin/moderation/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {loading ? (
        <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
      ) : (
        <>
          <button
            onClick={() => action("actioned")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" /> Remove
          </button>
          <button
            onClick={() => action("dismissed")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/50 hover:text-white hover:bg-white/10 text-xs font-medium transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Dismiss
          </button>
        </>
      )}
    </div>
  );
}
