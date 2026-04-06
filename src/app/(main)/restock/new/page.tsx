"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Camera, ArrowLeft } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import { createRestock } from "@/services/restocks";
import { getCategories } from "@/config/category-registry";

export default function NewRestockPage() {
  const router = useRouter();
  const categories = getCategories();

  const [form, setForm] = useState({
    store_name: "",
    store_address: "",
    item_found: "",
    category: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function detectLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation not supported by your browser");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Reverse geocode via Mapbox (or placeholder)
          const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
          if (token) {
            const res = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${token}&types=address&limit=1`
            );
            const data = await res.json();
            if (data.features?.[0]) {
              updateField("store_address", data.features[0].place_name);
            }
          }
        } catch {
          // Silently fail, user can type manually
        } finally {
          setLocating(false);
        }
      },
      () => {
        setError("Unable to get your location");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.store_name || !form.item_found) {
      setError("Store name and item found are required");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // TODO: Get actual user_id from auth context
      await createRestock({
        user_id: "placeholder",
        store_name: form.store_name,
        store_address: form.store_address || undefined,
        item_found: form.item_found,
        category: form.category || undefined,
        description: form.description || undefined,
      });
      router.push("/restock");
    } catch (err) {
      console.error("Failed to create restock:", err);
      setError("Failed to submit restock report");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="w-6 h-6 text-[var(--color-warning)]" />
          Report a Restock
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Help the community by sharing what you found
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Store name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Store Name *
            </label>
            <Input
              value={form.store_name}
              onChange={(e) => updateField("store_name", e.target.value)}
              placeholder="e.g., Target - Westfield Mall"
            />
          </div>

          {/* Store address with geolocation */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Store Address
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={form.store_address}
                  onChange={(e) => updateField("store_address", e.target.value)}
                  placeholder="Enter address or use location"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={detectLocation}
                disabled={locating}
              >
                <MapPin className="w-4 h-4" />
                {locating ? "Locating..." : "Detect"}
              </Button>
            </div>
          </div>

          {/* Item found */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Item Found *
            </label>
            <Input
              value={form.item_found}
              onChange={(e) => updateField("item_found", e.target.value)}
              placeholder="e.g., Pokémon 151 Booster Box"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Additional Details
            </label>
            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="e.g., Full shelf, just stocked. Aisle 3 near electronics."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] resize-none"
            />
          </div>

          {/* Photo placeholder */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Photo (optional)
            </label>
            <div className="flex items-center justify-center h-32 rounded-lg border-2 border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] text-sm cursor-pointer hover:border-[var(--color-accent)] transition-colors">
              <div className="text-center">
                <Camera className="w-6 h-6 mx-auto mb-1" />
                <p>Tap to add photo</p>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Submitting..." : "Submit Restock Report"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
