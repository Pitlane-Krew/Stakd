"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { CATEGORIES } from "@/config/constants";
import { createCollection } from "@/services/collections";

interface Props {
  userId: string;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateCollectionModal({ userId, open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("cards");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);

    try {
      await createCollection(userId, { name: name.trim(), category, description: description.trim() || undefined });
      setName("");
      setCategory("cards");
      setDescription("");
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Collection">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="name"
          label="Collection Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Pokémon Cards"
          required
        />

        <div className="space-y-1.5">
          <label className="text-sm text-[var(--color-text-muted)]">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg text-sm focus:border-[var(--color-accent)] transition-colors"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-[var(--color-text-muted)]">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's in this collection?"
            rows={2}
            className="w-full px-3 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg text-sm focus:border-[var(--color-accent)] transition-colors placeholder:text-[var(--color-text-muted)] resize-none"
          />
        </div>

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Create Collection</Button>
        </div>
      </form>
    </Modal>
  );
}
