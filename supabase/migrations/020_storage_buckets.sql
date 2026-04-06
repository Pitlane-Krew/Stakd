-- Storage buckets for user uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('items', 'items', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('restocks', 'restocks', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('enhanced', 'enhanced', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- RLS for items bucket: anyone can view, authenticated users can upload to their folder
CREATE POLICY "Public read items" ON storage.objects
  FOR SELECT USING (bucket_id = 'items');

CREATE POLICY "Auth users upload items" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'items'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users delete own items" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'items'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS for avatars bucket
CREATE POLICY "Public read avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Auth users upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users delete own avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS for restocks bucket
CREATE POLICY "Public read restocks" ON storage.objects
  FOR SELECT USING (bucket_id = 'restocks');

CREATE POLICY "Auth users upload restocks" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'restocks'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS for enhanced bucket
CREATE POLICY "Public read enhanced" ON storage.objects
  FOR SELECT USING (bucket_id = 'enhanced');

CREATE POLICY "Auth users upload enhanced" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'enhanced'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
