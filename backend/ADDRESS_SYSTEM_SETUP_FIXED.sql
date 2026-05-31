-- SQL Query to Fix and Create the Address Management System

-- 1. Drop existing table if it exists to ensure fresh start with correct columns
DROP TABLE IF EXISTS public.addresses CASCADE;

-- 2. Create addresses table matching exact requirements
CREATE TABLE public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'India',
    label TEXT CHECK (label IN ('Home', 'Work', 'Other')) DEFAULT 'Home',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add RLS Policies for addresses
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- Note: In many Firebase-Supabase integrations, auth.uid() returns the Firebase UID.
-- If your setup syncs Firebase UIDs to a 'users' table, we check both possibilities.
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

-- 4. Update orders table to include delivery_address snapshot if not already there
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='delivery_address') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_address JSONB;
    END IF;
END $$;

-- 5. Function to handle default address logic
-- Ensures only one address is default per user
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

-- Re-create trigger
DROP TRIGGER IF EXISTS set_default_address_trigger ON public.addresses;
CREATE TRIGGER set_default_address_trigger
BEFORE INSERT OR UPDATE ON public.addresses
FOR EACH ROW
EXECUTE FUNCTION handle_default_address();
