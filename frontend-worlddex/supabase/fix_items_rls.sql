-- Fix Row Level Security for all_items table
-- This allows authenticated users to create items when capturing new objects

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can view all items" ON all_items;

-- Create new policies for all_items table
CREATE POLICY "Anyone can view all items" ON all_items
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create items" ON all_items
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update items" ON all_items
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Also create the RPC function for incrementing captures if it doesn't exist
CREATE OR REPLACE FUNCTION increment_item_captures(item_id UUID, increment_amount INTEGER DEFAULT 1)
RETURNS VOID AS $$
BEGIN
    UPDATE all_items 
    SET total_captures = total_captures + increment_amount
    WHERE id = item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;