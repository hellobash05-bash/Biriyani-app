-- ENABLE REALTIME FOR ADMIN DASHBOARD
-- Run this in your Supabase SQL Editor

-- 1. Add tables to the publication to enable Realtime
-- We use a DO block to safely add tables even if they are already there
DO $$
BEGIN
  -- Ensure publication exists
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  -- Add tables (ignore if already added)
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE delivery_partners;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- 2. Ensure REPLICA IDENTITY is set to FULL for precise updates
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE order_items REPLICA IDENTITY FULL;
ALTER TABLE delivery_partners REPLICA IDENTITY FULL;

-- 3. CRITICAL: ENABLE RLS AND ADD POLICIES
-- If RLS is enabled, the 'anon' key used by the frontend won't see updates unless there's a policy.
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_partners ENABLE ROW LEVEL SECURITY;

-- For a prototype, we allow 'anon' to read. In production, you'd restrict this to Admin users.
DROP POLICY IF EXISTS "Allow anon read access to orders" ON orders;
CREATE POLICY "Allow anon read access to orders" ON orders FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon read access to order_items" ON order_items;
CREATE POLICY "Allow anon read access to order_items" ON order_items FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anon read access to delivery_partners" ON delivery_partners;
CREATE POLICY "Allow anon read access to delivery_partners" ON delivery_partners FOR SELECT TO anon USING (true);

-- 4. Verify publication
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
