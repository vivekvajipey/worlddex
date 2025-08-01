-- Fix total_captures sync issue (JSV-401)
-- This migration creates triggers to keep users.total_captures in sync with actual capture count

-- Drop existing triggers if they exist (for idempotency)
DROP TRIGGER IF EXISTS capture_insert_trigger ON captures;
DROP TRIGGER IF EXISTS capture_soft_delete_trigger ON captures;
DROP FUNCTION IF EXISTS update_user_total_captures_on_insert();
DROP FUNCTION IF EXISTS update_user_total_captures_on_delete();

-- Trigger function to increment total_captures on insert
CREATE OR REPLACE FUNCTION update_user_total_captures_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users 
    SET total_captures = total_captures + 1
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for capture inserts
CREATE TRIGGER capture_insert_trigger
AFTER INSERT ON captures
FOR EACH ROW
EXECUTE FUNCTION update_user_total_captures_on_insert();

-- Trigger function to handle soft deletes (decrement when deleted_at is set)
CREATE OR REPLACE FUNCTION update_user_total_captures_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if this is a soft delete (deleted_at changing from NULL to a value)
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        UPDATE users 
        SET total_captures = GREATEST(0, total_captures - 1)  -- Prevent negative values
        WHERE id = NEW.user_id;
    -- Check if this is an undelete (deleted_at changing from a value to NULL)
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
        UPDATE users 
        SET total_captures = total_captures + 1
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for capture soft deletes/undeletes
CREATE TRIGGER capture_soft_delete_trigger
AFTER UPDATE ON captures
FOR EACH ROW
WHEN (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at)
EXECUTE FUNCTION update_user_total_captures_on_delete();

-- Add index for better performance on capture queries
CREATE INDEX IF NOT EXISTS idx_captures_user_deleted ON captures(user_id, deleted_at);

-- One-time sync to fix all existing user total_captures counts
-- This ensures all users have accurate counts based on their actual captures
UPDATE users u
SET total_captures = COALESCE((
    SELECT COUNT(*) 
    FROM captures c 
    WHERE c.user_id = u.id 
    AND c.deleted_at IS NULL
), 0);

-- Verify the sync worked by showing any discrepancies (should return 0 rows)
SELECT 
    u.id,
    u.username,
    u.total_captures as user_total,
    COUNT(c.id) as actual_count
FROM users u
LEFT JOIN captures c ON c.user_id = u.id AND c.deleted_at IS NULL
GROUP BY u.id, u.username, u.total_captures
HAVING u.total_captures != COUNT(c.id);