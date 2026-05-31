-- FINAL ADDRESS SCHEMA FIX
-- Run this in your Supabase SQL Editor to ensure the addresses table has all required columns

-- 1. Add missing identity columns
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS firebase_uid TEXT;

-- 2. Add missing modern address fields
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE public.addresses ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;

-- 3. Ensure legacy/modern column mapping exists (for backward compatibility)
-- Some older code might use address_line1 while newer uses house
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='address_line1') THEN
        ALTER TABLE public.addresses ADD COLUMN address_line1 TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='address_line2') THEN
        ALTER TABLE public.addresses ADD COLUMN address_line2 TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='full_name') THEN
        ALTER TABLE public.addresses ADD COLUMN full_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='state') THEN
        ALTER TABLE public.addresses ADD COLUMN state TEXT;
    END IF;
END $$;

-- 4. Sync existing data if possible (Optional but helpful)
UPDATE public.addresses SET address_line1 = house WHERE address_line1 IS NULL AND house IS NOT NULL;
UPDATE public.addresses SET address_line2 = street WHERE address_line2 IS NULL AND street IS NOT NULL;
UPDATE public.addresses SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;

-- 6. Link Addresses to Orders
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='address_id') THEN
        ALTER TABLE public.orders ADD COLUMN address_id UUID REFERENCES public.addresses(id);
    END IF;
END $$;

-- 5. Update RLS Policies to be robust
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can insert their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can update their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can delete their own addresses" ON public.addresses;

CREATE POLICY "Users can view their own addresses" 
ON public.addresses FOR SELECT 
USING (
    firebase_uid = auth.uid()::text 
    OR 
    user_id IN (SELECT id FROM public.users WHERE uid = auth.uid()::text)
    OR
    firebase_uid IS NULL -- Allow public read if requested via service role
);

CREATE POLICY "Users can insert their own addresses" 
ON public.addresses FOR INSERT 
WITH CHECK (true); -- Backend handles validation

CREATE POLICY "Users can update their own addresses" 
ON public.addresses FOR UPDATE 
USING (
    firebase_uid = auth.uid()::text 
    OR 
    user_id IN (SELECT id FROM public.users WHERE uid = auth.uid()::text)
);

CREATE POLICY "Users can delete their own addresses" 
ON public.addresses FOR DELETE 
USING (
    firebase_uid = auth.uid()::text 
    OR 
    user_id IN (SELECT id FROM public.users WHERE uid = auth.uid()::text)
);


