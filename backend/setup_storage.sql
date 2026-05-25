-- Run this in your Supabase SQL Editor to set up image uploads

-- 1. Create the storage bucket for menu photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policy: Allow anyone to VIEW the photos (Public Access)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'menu-images' );

-- 3. Policy: Allow the backend (service role) to UPLOAD photos
-- Note: The Service Role key bypasses RLS, but these policies ensure 
-- the bucket is configured correctly for public serving.
CREATE POLICY "Full Access for Backend"
ON storage.objects FOR ALL
USING ( bucket_id = 'menu-images' )
WITH CHECK ( bucket_id = 'menu-images' );
