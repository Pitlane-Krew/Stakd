"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Layers } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getCollections } from "@/services/collections";
import CollectionCard from "./CollectionCard";
import CreateCollectionModal from "./CreateCollectionModal";
import Button from "@/components/ui/Button";
import type { Collection } from "@/types/database";

export default function CollectionGrid() {
  const { user } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getCollections(user.id);
      setCollections(data);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="h-7 w-32 skeleton rounded-lg" />
          <div className="h-9 w-20 skeleton rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-2xl skeleton"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold">Collections</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {collections.length} collection{collections.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          size="sm"
          className="rounded-xl"
        >
          <Plus className="w-4 h-4" /> New
        </Button>
      </div>

      {collections.length === 0 ? (
        <div className="text-center py-16 px-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--color-accent-subtle)] flex items-center justify-center mb-4">
            <Layers className="w-8 h-8 text-[var(--color-accent)]" />
          </div>
          <h3 className="text-lg font-bold mb-2">No Collections Yet</h3>
          <p className="text-sm text-[var(--color-text-muted)] mb-6 max-w-xs mx-auto">
            Start building your digital portfolio. Create your first collection
            to track and showcase your collectibles.
          </p>
          <Button
            onClick={() => setShowCreate(true)}
            className="rounded-xl"
          >
            <Plus className="w-4 h-4" /> Create Collection
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
          {collections.map((c) => (
            <CollectionCard key={c.id} collection={c} />
          ))}
        </div>
      )}

      {user && (
        <CreateCollectionModal
          userId={user.id}
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={load}
        />
      )}
    </>
  );
}
