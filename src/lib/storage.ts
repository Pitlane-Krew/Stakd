import { createClient } from "@/lib/supabase/client";
import { MAX_FILE_SIZE_MB } from "@/config/constants";

type UploadBucket = "avatars" | "items" | "restocks" | "enhanced";

interface UploadResult {
  url: string;
  path: string;
}

export async function uploadImage(
  bucket: UploadBucket,
  file: File,
  userId: string
): Promise<UploadResult> {
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    throw new Error(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit`);
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed");
  }

  const supabase = createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);

  return {
    url: data.publicUrl,
    path: fileName,
  };
}

export async function deleteImage(
  bucket: UploadBucket,
  path: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}
