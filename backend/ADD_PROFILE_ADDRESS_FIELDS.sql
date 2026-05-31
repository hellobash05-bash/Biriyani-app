-- Phase 1: Extended Profile & Address Fields

-- 1. Update Users Table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 2. Update Addresses Table
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;

-- 3. Setup Profile Image Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Enable RLS for Profile Image Storage
-- Note: Replace with actual RLS logic if needed, but these are standard for public read
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public Profile Images' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Public Profile Images"
        ON storage.objects FOR SELECT
        USING ( bucket_id = 'profile-images' );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Backend Profile Image Upload' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Backend Profile Image Upload"
        ON storage.objects FOR ALL
        USING ( bucket_id = 'profile-images' )
        WITH CHECK ( bucket_id = 'profile-images' );
    END IF;
END
$$;
