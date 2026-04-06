"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ImageUploader from "./ImageUploader";
import DynamicAttributeForm from "./DynamicAttributeForm";
import { CONDITIONS, GRADING_COMPANIES } from "@/config/constants";
import { getCategory, validateAttributes } from "@/config/category-registry";
import { createItem } from "@/services/collections";

interface Props {
  userId: string;
  collectionId: string;
  collectionCategory: string;
  onCreated: () => void;
  onCancel: () => void;
}

export default function ItemForm({ userId, collectionId, collectionCategory, onCreated, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [condition, setCondition] = useState("raw");
  const [gradeValue, setGradeValue] = useState("");
  const [gradingCompany, setGradingCompany] = useState("");
  const [description, setDescription] = useState("");
  const [year, setYear] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isForTrade, setIsForTrade] = useState(false);
  const [isForSale, setIsForSale] = useState(false);
  const [attributes, setAttributes] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryDef = getCategory(collectionCategory);
  const showGrading = categoryDef?.gradingEnabled && condition === "graded";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Validate category-specific attributes
    const validation = validateAttributes(collectionCategory, attributes);
    if (!validation.valid) {
      setError(validation.errors.join(", "));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createItem({
        collection_id: collectionId,
        user_id: userId,
        title: title.trim(),
        category: collectionCategory,
        condition,
        description: description.trim() || undefined,
        grade_value: gradeValue || undefined,
        grading_company: gradingCompany || undefined,
        year: year ? parseInt(year) : undefined,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : undefined,
        estimated_value: estimatedValue ? parseFloat(estimatedValue) : undefined,
        image_urls: images,
        is_for_trade: isForTrade,
        is_for_sale: isForSale,
        attributes,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <ImageUploader userId={userId} images={images} onChange={setImages} />

      <Input id="title" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Item name..." required />

      {/* ─── Category-Specific Dynamic Fields ─── */}
      {categoryDef && (
        <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg)] p-4">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-medium mb-3" style={{ color: categoryDef.color }}>
            {categoryDef.label} Fields
          </p>
          <DynamicAttributeForm
            categoryId={collectionCategory}
            attributes={attributes}
            onChange={setAttributes}
          />
        </div>
      )}

      {/* ─── Universal Fields ─── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm text-[var(--color-text-muted)]">Condition</label>
          <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full px-3 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg text-sm">
            {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {showGrading && (
          <div className="space-y-1.5">
            <label className="text-sm text-[var(--color-text-muted)]">Grading Company</label>
            <select value={gradingCompany} onChange={(e) => setGradingCompany(e.target.value)} className="w-full px-3 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg text-sm">
              <option value="">Select...</option>
              {GRADING_COMPANIES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {showGrading && (
        <Input id="grade" label="Grade" value={gradeValue} onChange={(e) => setGradeValue(e.target.value)} placeholder="PSA 10" />
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input id="year" label="Year" type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2024" />
        <Input id="purchase" label="Purchase Price" type="number" step="0.01" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="0.00" />
      </div>

      <Input id="estimated" label="Estimated Value" type="number" step="0.01" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} placeholder="0.00" />

      <div className="space-y-1.5">
        <label className="text-sm text-[var(--color-text-muted)]">Description (optional)</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Additional details..." rows={2} className="w-full px-3 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg text-sm placeholder:text-[var(--color-text-muted)] resize-none" />
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={isForTrade} onChange={(e) => setIsForTrade(e.target.checked)} className="rounded border-[var(--color-border)] accent-[var(--color-accent)]" />
          Available for trade
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={isForSale} onChange={(e) => setIsForSale(e.target.checked)} className="rounded border-[var(--color-border)] accent-[var(--color-accent)]" />
          For sale
        </label>
      </div>

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>Add Item</Button>
      </div>
    </form>
  );
}
