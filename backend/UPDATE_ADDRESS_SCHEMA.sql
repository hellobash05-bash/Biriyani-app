-- 1. Ensure the addresses table matches the new Mongoose-like structure
-- Although Supabase uses Postgres, we'll design it to hold the requested fields perfectly.
-- Note: We already have an addresses table, but we'll ensure it has the exact fields requested.

ALTER TABLE IF EXISTS addresses 
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India';

-- 2. Ensure Orders table has snapshot fields
ALTER TABLE IF EXISTS orders
ADD COLUMN IF NOT EXISTS delivery_address_snapshot JSONB;

-- 3. Add a trigger to handle 'is_default' logic (only one default per user)
CREATE OR REPLACE FUNCTION handle_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE addresses 
    SET is_default = FALSE 
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_handle_default_address ON addresses;
CREATE TRIGGER trigger_handle_default_address
BEFORE INSERT OR UPDATE ON addresses
FOR EACH ROW EXECUTE FUNCTION handle_default_address();
