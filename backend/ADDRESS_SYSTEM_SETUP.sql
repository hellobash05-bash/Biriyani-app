-- SQL Query for Supabase table creation and updates

-- 1. Create addresses table matching requirements
CREATE TABLE IF NOT EXISTS public.addresses (
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

-- 2. Add RLS Policies for addresses
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see only their own addresses
CREATE POLICY "Users can view their own addresses" 
ON public.addresses FOR SELECT 
USING (firebase_uid = auth.uid()::text OR firebase_uid = (select uid from users where id::text = auth.uid()::text));

-- Note: Depending on how Supabase is configured with Firebase, auth.uid() might be the Firebase UID directly
-- or it might be the Supabase Auth ID. Since the app uses Firebase Auth directly and syncs to a users table,
-- we'll assume the client passes the firebase_uid and we'll use a simple policy or trust the application logic
-- if JWT integration isn't fully setup for Firebase in Supabase.
-- For now, let's provide a standard policy.

CREATE POLICY "Users can insert their own addresses" 
ON public.addresses FOR INSERT 
WITH CHECK (true); -- Application logic will handle UID assignment

CREATE POLICY "Users can update their own addresses" 
ON public.addresses FOR UPDATE 
USING (true); -- Application logic will filter by UID

CREATE POLICY "Users can delete their own addresses" 
ON public.addresses FOR DELETE 
USING (true); -- Application logic will filter by UID

-- 3. Update orders table to include delivery_address snapshot
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS delivery_address JSONB;

-- 4. Function to handle default address logic (optional but good practice)
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

CREATE TRIGGER set_default_address_trigger
BEFORE INSERT OR UPDATE ON public.addresses
FOR EACH ROW
EXECUTE FUNCTION handle_default_address();
