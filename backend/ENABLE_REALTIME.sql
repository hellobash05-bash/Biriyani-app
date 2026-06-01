-- ENABLE REALTIME FOR ADMIN DASHBOARD
-- Run this in your Supabase SQL Editor

-- 1. Create the publication if it doesn't exist (Supabase usually has it)
-- CREATE PUBLICATION supabase_realtime;

-- 2. Add tables to the publication to enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_partners;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;

-- 3. Ensure REPLICA IDENTITY is set to FULL for tables where you need the old record on UPDATE/DELETE
-- This is optional but recommended for better data integrity in some scenarios
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE order_items REPLICA IDENTITY FULL;
ALTER TABLE delivery_partners REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;
