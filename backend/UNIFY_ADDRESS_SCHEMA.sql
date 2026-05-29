-- Unify Address System Schema
-- This script ensures the addresses table supports both Legacy and Modern schemas

-- 1. Ensure the table exists with the base columns
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add all columns from both schemas safely
DO $$ 
BEGIN 
    -- Linking Columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='user_id') THEN
        ALTER TABLE public.addresses ADD COLUMN user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='firebase_uid') THEN
        ALTER TABLE public.addresses ADD COLUMN firebase_uid TEXT;
    END IF;

    -- Common Columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='label') THEN
        ALTER TABLE public.addresses ADD COLUMN label TEXT DEFAULT 'Home';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='phone') THEN
        ALTER TABLE public.addresses ADD COLUMN phone TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='is_default') THEN
        ALTER TABLE public.addresses ADD COLUMN is_default BOOLEAN DEFAULT FALSE;
    END IF;

    -- Legacy Schema Columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='name') THEN
        ALTER TABLE public.addresses ADD COLUMN name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='house') THEN
        ALTER TABLE public.addresses ADD COLUMN house TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='street') THEN
        ALTER TABLE public.addresses ADD COLUMN street TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='city') THEN
        ALTER TABLE public.addresses ADD COLUMN city TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='pincode') THEN
        ALTER TABLE public.addresses ADD COLUMN pincode TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='landmark') THEN
        ALTER TABLE public.addresses ADD COLUMN landmark TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='detail') THEN
        ALTER TABLE public.addresses ADD COLUMN detail TEXT;
    END IF;

    -- Modern Schema Columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='full_name') THEN
        ALTER TABLE public.addresses ADD COLUMN full_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='address_line1') THEN
        ALTER TABLE public.addresses ADD COLUMN address_line1 TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='address_line2') THEN
        ALTER TABLE public.addresses ADD COLUMN address_line2 TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='state') THEN
        ALTER TABLE public.addresses ADD COLUMN state TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='country') THEN
        ALTER TABLE public.addresses ADD COLUMN country TEXT DEFAULT 'India';
    END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- 4. Drop old policies
DROP POLICY IF EXISTS "Users can view their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can insert their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can update their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can delete their own addresses" ON public.addresses;

-- 5. Create inclusive policies
-- Allow access if either user_id matches or firebase_uid matches
CREATE POLICY "Users can view their own addresses" 
ON public.addresses FOR SELECT 
USING (
    firebase_uid = auth.uid()::text 
    OR 
    user_id IN (SELECT id FROM public.users WHERE uid = auth.uid()::text)
);

CREATE POLICY "Users can insert their own addresses" 
ON public.addresses FOR INSERT 
WITH CHECK (true);

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

-- 6. Trigger for Default Address (Unfied)
CREATE OR REPLACE FUNCTION handle_default_address()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default THEN
        -- Clear defaults for the same user (using both potential identifiers)
        UPDATE public.addresses
        SET is_default = FALSE
        WHERE (user_id = NEW.user_id OR firebase_uid = NEW.firebase_uid) AND id <> NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_default_address_trigger ON public.addresses;
CREATE TRIGGER set_default_address_trigger
BEFORE INSERT OR UPDATE ON public.addresses
FOR EACH ROW
EXECUTE FUNCTION handle_default_address();
