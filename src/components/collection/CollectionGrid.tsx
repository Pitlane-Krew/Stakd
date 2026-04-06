"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
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

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-52 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Collections</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {collections.length} collection{collections.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="w-4 h-4" /> New
        </Button>
      </div>

      {collections.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[var(--color-text-muted)]">No collections yet</p>
          <Button onClick={() => setShowCreate(true)} className="mt-4">
            Create your first collection
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
