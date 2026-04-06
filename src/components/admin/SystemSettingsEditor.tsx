"use client";

import { useState } from "react";
import { Save, Loader2 } from "lucide-react";

interface Setting {
  key: string;
  value: unknown;
  description: string | null;
}

interface Props {
  settings: Setting[];
}

export default function SystemSettingsEditor({ settings }: Props) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(
      settings.map((s) => [s.key, JSON.stringify(s.value).replace(/^"|"$/g, "")])
    )
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function saveSetting(key: string) {
    setSaving(key);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: values[key] }),
    });
    setSaving(null);
    setSaved(key);
    setTimeout(() => setSaved(null), 2000);
  }

  const BOOL_KEYS = ["beta_mode", "maintenance_mode", "signups_enabled", "ai_grading_enabled", "valuation_enabled"];

  return (
    <div className="divide-y divide-white/5">
      {settings.map((setting) => {
        const isBool = BOOL_KEYS.includes(setting.key);
        const val = values[setting.key] ?? "";
        const isSaving = saving === setting.key;
        const wasSaved = saved === setting.key;

        return (
          <div key={setting.key} className="px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-mono font-medium text-white/80">{setting.key}</p>
              {setting.description && (
                <p className="text-xs text-white/40 mt-0.5">{setting.description}</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {isBool ? (
                <button
                  onClick={() => {
                    const newVal = val === "true" ? "false" : "true";
                    setValues((prev) => ({ ...prev, [setting.key]: newVal }));
                  }}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    val === "true" ? "bg-[var(--color-accent)]" : "bg-white/20"
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${val === "true" ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              ) : (
                <input
                  value={val}
                  onChange={(e) => setValues((prev) => ({ ...prev, [setting.key]: e.target.value }))}
                  className="w-24 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-white font-mono text-right"
                />
              )}

              <button
                onClick={() => saveSetting(setting.key)}
                disabled={isSaving}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  wasSaved
                    ? "text-emerald-400 bg-emerald-400/10"
                    : "text-white/50 hover:text-white bg-white/5 hover:bg-white/10"
                }`}
              >
                {isSaving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                {wasSaved ? "Saved" : "Save"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
