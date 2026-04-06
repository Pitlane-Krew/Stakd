"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getCollection, getItems, deleteCollection } from "@/services/collections";
import ItemCard from "@/components/item/ItemCard";
import ItemForm from "@/components/item/ItemForm";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import type { Collection, Item } from "@/types/database";

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [col, itms] = await Promise.all([getCollection(id), getItems(id)]);
      setCollection(col);
      setItems(itms);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!confirm("Delete this collection and all its items?")) return;
    await deleteCollection(id);
    router.push("/collection");
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 bg-[var(--color-bg-elevated)] rounded" />
      <div className="h-4 w-32 bg-[var(--color-bg-elevated)] rounded" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
        {[...Array(4)].map((_, i) => <div key={i} className="aspect-square rounded-xl bg-[var(--color-bg-elevated)]" />)}
      </div>
    </div>;
  }

  if (!collection) return <p className="text-[var(--color-text-muted)]">Collection not found.</p>;

  const isOwner = user?.id === collection.user_id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] mb-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl font-bold">{collection.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-[var(--color-text-muted)]">
            <span>{collection.item_count} items</span>
            {Number(collection.total_value) > 0 && (
              <span className="text-[var(--color-success)] font-medium">
                {formatCurrency(Number(collection.total_value))}
              </span>
            )}
          </div>
          {collection.description && (
            <p className="text-sm text-[var(--color-text-muted)] mt-2">{collection.description}</p>
          )}
        </div>

        {isOwner && (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setShowAddItem(true)}>
              <Plus className="w-4 h-4" /> Add Item
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Items grid */}
      {items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[var(--color-text-muted)]">No items in this collection yet</p>
          {isOwner && (
            <Button onClick={() => setShowAddItem(true)} className="mt-4">Add your first item</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((item) => <ItemCard key={item.id} item={item} />)}
        </div>
      )}

      {/* Add Item Modal */}
      {isOwner && (
        <Modal open={showAddItem} onClose={() => setShowAddItem(false)} title="Add Item">
          <ItemForm
            userId={user!.id}
            collectionId={id}
            collectionCategory={collection.category}
            onCreated={() => { setShowAddItem(false); load(); }}
            onCancel={() => setShowAddItem(false)}
          />
        </Modal>
      )}
    </div>
  );
}
