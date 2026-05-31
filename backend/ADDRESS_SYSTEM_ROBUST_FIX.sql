-- Robust SQL Fix for Address Management System
-- This script safely adds the missing column or creates the table from scratch

-- 1. Ensure the table exists
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT,
    is_default BOOLEAN DEFAULT FALSE
);

-- 2. Safely add the firebase_uid column if it's missing
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='firebase_uid') THEN
        ALTER TABLE public.addresses ADD COLUMN firebase_uid TEXT;
    END IF;
END $$;

-- 3. Set firebase_uid to NOT NULL (after ensuring it exists)
-- Note: If you have existing data, you might need to populate it first.
-- Since this is a setup phase, we'll assume we can set it to NOT NULL.
ALTER TABLE public.addresses ALTER COLUMN firebase_uid SET NOT NULL;

-- 4. Add/Update all other required columns
DO $$ 
BEGIN 
    -- Full Name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='full_name') THEN
        ALTER TABLE public.addresses ADD COLUMN full_name TEXT NOT NULL DEFAULT 'User';
    END IF;
    
    -- Phone
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='phone') THEN
        ALTER TABLE public.addresses ADD COLUMN phone TEXT NOT NULL DEFAULT '';
    END IF;

    -- Address Line 1
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='address_line1') THEN
        ALTER TABLE public.addresses ADD COLUMN address_line1 TEXT NOT NULL DEFAULT '';
    END IF;

    -- Address Line 2
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='address_line2') THEN
        ALTER TABLE public.addresses ADD COLUMN address_line2 TEXT;
    END IF;

    -- City
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='city') THEN
        ALTER TABLE public.addresses ADD COLUMN city TEXT NOT NULL DEFAULT '';
    END IF;

    -- State
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='state') THEN
        ALTER TABLE public.addresses ADD COLUMN state TEXT NOT NULL DEFAULT '';
    END IF;

    -- Pincode
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='pincode') THEN
        ALTER TABLE public.addresses ADD COLUMN pincode TEXT NOT NULL DEFAULT '';
    END IF;

    -- Country
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='country') THEN
        ALTER TABLE public.addresses ADD COLUMN country TEXT NOT NULL DEFAULT 'India';
    END IF;

    -- Created At
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addresses' AND column_name='created_at') THEN
        ALTER TABLE public.addresses ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 5. Clean up any columns that might be from the old schema (optional but recommended)
-- ALTER TABLE public.addresses DROP COLUMN IF EXISTS user_id;
-- ALTER TABLE public.addresses DROP COLUMN IF EXISTS house;
-- ALTER TABLE public.addresses DROP COLUMN IF EXISTS street;
-- ALTER TABLE public.addresses DROP COLUMN IF EXISTS landmark;
-- ALTER TABLE public.addresses DROP COLUMN IF EXISTS detail;

-- 6. Enable RLS
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- 7. Drop old policies to avoid "policy already exists" errors
DROP POLICY IF EXISTS "Users can view their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can insert their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can update their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can delete their own addresses" ON public.addresses;

-- 8. Create new policies
CREATE POLICY "Users can view their own addresses" 
ON public.addresses FOR SELECT 
USING (
    firebase_uid = auth.uid()::text 
    OR 
    firebase_uid = (SELECT uid FROM public.users WHERE id::text = auth.uid()::text LIMIT 1)
);

CREATE POLICY "Users can insert their own addresses" 
ON public.addresses FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own addresses" 
ON public.addresses FOR UPDATE 
USING (
    firebase_uid = auth.uid()::text 
    OR 
    firebase_uid = (SELECT uid FROM public.users WHERE id::text = auth.uid()::text LIMIT 1)
);

CREATE POLICY "Users can delete their own addresses" 
ON public.addresses FOR DELETE 
USING (
    firebase_uid = auth.uid()::text 
    OR 
    firebase_uid = (SELECT uid FROM public.users WHERE id::text = auth.uid()::text LIMIT 1)
);

-- 9. Function to handle default address logic
CREATE OR REPLACE FUNCTION handle_default_address()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default THEN
        UPDATE public.addresses
        SET is_default = FALSE
        WHERE firebase_uid = NEW.firebase_uid AND id <> NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Re-create trigger
DROP TRIGGER IF EXISTS set_default_address_trigger ON public.addresses;
CREATE TRIGGER set_default_address_trigger
BEFORE INSERT OR UPDATE ON public.addresses
FOR EACH ROW
EXECUTE FUNCTION handle_default_address();

-- 11. Ensure orders has delivery_address
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='delivery_address') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_address JSONB;
    END IF;
END $$;
