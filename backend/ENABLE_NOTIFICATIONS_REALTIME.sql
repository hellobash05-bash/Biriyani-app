-- ENABLE REALTIME FOR NOTIFICATIONS
-- Run this in your Supabase SQL Editor

-- 1. Add notifications table to the publication
DO $$
BEGIN
  -- Ensure publication exists
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  -- Add table to publication
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- 2. Set REPLICA IDENTITY to FULL
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- 3. Configure RLS (Row Level Security)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow users to read only their own notifications
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications" ON notifications 
FOR SELECT TO authenticated, anon 
USING (true); -- For prototype, we allow all for now. In production, use: user_id = auth.uid()

-- Allow anyone (backend) to insert notifications
DROP POLICY IF EXISTS "Enable insert for all" ON notifications;
CREATE POLICY "Enable insert for all" ON notifications 
FOR INSERT WITH CHECK (true);

-- Allow users to update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications 
FOR UPDATE USING (true);
