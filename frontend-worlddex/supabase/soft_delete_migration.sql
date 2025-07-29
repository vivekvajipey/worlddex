-- Soft Delete Migration for WorldDex
-- This migration adds soft delete functionality with a 30-day grace period

-- Add soft delete column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

-- Update RLS policies to hide soft-deleted users
-- Drop existing policies first (if they exist)
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Recreate policies with soft delete filter
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id AND deleted_at IS NULL);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id AND deleted_at IS NULL);

-- Create function to soft delete a user
CREATE OR REPLACE FUNCTION soft_delete_user(user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE users 
    SET deleted_at = NOW()
    WHERE id = user_id AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to restore a soft-deleted user
CREATE OR REPLACE FUNCTION restore_deleted_user(user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE users 
    SET deleted_at = NULL
    WHERE id = user_id 
    AND deleted_at IS NOT NULL
    AND deleted_at > NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to hard delete users after 30 days
CREATE OR REPLACE FUNCTION hard_delete_expired_users()
RETURNS void AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Find all users soft deleted more than 30 days ago
    FOR user_record IN 
        SELECT id FROM users 
        WHERE deleted_at IS NOT NULL 
        AND deleted_at < NOW() - INTERVAL '30 days'
    LOOP
        -- Update references first
        UPDATE captures SET last_owner_id = NULL WHERE last_owner_id = user_record.id;
        
        -- Delete all user data
        DELETE FROM xp_transactions WHERE user_id = user_record.id;
        DELETE FROM likes WHERE user_id = user_record.id;
        DELETE FROM comments WHERE user_id = user_record.id;
        DELETE FROM user_collection_items WHERE user_id = user_record.id;
        DELETE FROM user_collections WHERE user_id = user_record.id;
        DELETE FROM bids WHERE bidder_id = user_record.id;
        DELETE FROM trade_offers WHERE offerer_id = user_record.id;
        DELETE FROM transactions WHERE buyer_id = user_record.id OR seller_id = user_record.id;
        DELETE FROM listings WHERE seller_id = user_record.id;
        DELETE FROM captures WHERE user_id = user_record.id;
        DELETE FROM collections WHERE created_by = user_record.id;
        
        -- Finally delete the user
        DELETE FROM users WHERE id = user_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create views that automatically filter out soft-deleted users
CREATE OR REPLACE VIEW active_users AS
SELECT * FROM users WHERE deleted_at IS NULL;

-- Update existing views to filter out content from deleted users
CREATE OR REPLACE VIEW active_captures AS
SELECT c.* FROM captures c
JOIN users u ON c.user_id = u.id
WHERE u.deleted_at IS NULL;

-- Grant permissions
GRANT EXECUTE ON FUNCTION soft_delete_user TO authenticated;
GRANT EXECUTE ON FUNCTION restore_deleted_user TO authenticated;
GRANT SELECT ON active_users TO authenticated;
GRANT SELECT ON active_captures TO authenticated;