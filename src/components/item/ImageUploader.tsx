"use client";

import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { uploadImage } from "@/lib/storage";
import { MAX_IMAGES_PER_ITEM } from "@/config/constants";

interface Props {
  userId: string;
  images: string[];
  onChange: (urls: string[]) => void;
}

export default function ImageUploader({ userId, images, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    const newUrls = [...images];

    for (const file of Array.from(files)) {
      if (newUrls.length >= MAX_IMAGES_PER_ITEM) break;
      try {
        const result = await uploadImage("items", file, userId);
        newUrls.push(result.url);
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }

    onChange(newUrls);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm text-[var(--color-text-muted)]">
        Photos ({images.length}/{MAX_IMAGES_PER_ITEM})
      </label>

      <div className="grid grid-cols-4 gap-2">
        {images.map((url, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-[var(--color-border)]">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {images.length < MAX_IMAGES_PER_ITEM && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed border-[var(--color-border)] flex flex-col items-center justify-center gap-1 hover:border-[var(--color-accent)] transition-colors"
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Upload className="w-4 h-4 text-[var(--color-text-muted)]" />
                <span className="text-[10px] text-[var(--color-text-muted)]">Upload</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  );
}
