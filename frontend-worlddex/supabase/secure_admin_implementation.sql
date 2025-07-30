-- Secure Admin Implementation for WorldDex

-- 1. Add is_admin column (if not already added)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Enable Row Level Security on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies to prevent users from modifying their own admin status

-- Policy: Users can view all user data
CREATE POLICY "Users can view all users" ON users
    FOR SELECT USING (true);

-- Policy: Users can only update their own record, but NOT the is_admin field
CREATE POLICY "Users can update own profile except admin status" ON users
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND
        -- Prevent updating is_admin field by checking it hasn't changed
        (is_admin IS NOT DISTINCT FROM OLD.is_admin)
    );

-- Policy: Only admins can update the is_admin field
CREATE POLICY "Only admins can grant admin privileges" ON users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND is_admin = true
        )
    );

-- 4. Create a secure function to check capture limits
CREATE OR REPLACE FUNCTION check_capture_limit_with_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_record RECORD;
    daily_limit INTEGER := 10;
BEGIN
    -- Get user data
    SELECT daily_captures_used, is_admin 
    INTO user_record
    FROM users 
    WHERE id = user_id;
    
    -- If user not found, deny
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Admins have unlimited captures
    IF user_record.is_admin THEN
        RETURN TRUE;
    END IF;
    
    -- Regular users check against limit
    RETURN user_record.daily_captures_used < daily_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;

-- 6. Create an audit table for admin actions (optional but recommended)
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    target_user_id UUID REFERENCES users(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    details JSONB
);

-- 7. Function to safely grant admin privileges (with audit logging)
CREATE OR REPLACE FUNCTION grant_admin_privileges(target_user_id UUID, granted_by UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if the granting user is an admin
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = granted_by AND is_admin = true) THEN
        RAISE EXCEPTION 'Only admins can grant admin privileges';
    END IF;
    
    -- Update the user's admin status
    UPDATE users SET is_admin = true WHERE id = target_user_id;
    
    -- Log the action
    INSERT INTO admin_audit_log (admin_id, action, target_user_id, details)
    VALUES (granted_by, 'GRANT_ADMIN', target_user_id, jsonb_build_object('granted_at', NOW()));
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to revoke admin privileges (with audit logging)
CREATE OR REPLACE FUNCTION revoke_admin_privileges(target_user_id UUID, revoked_by UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if the revoking user is an admin
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = revoked_by AND is_admin = true) THEN
        RAISE EXCEPTION 'Only admins can revoke admin privileges';
    END IF;
    
    -- Prevent admins from revoking their own privileges (optional safety measure)
    IF target_user_id = revoked_by THEN
        RAISE EXCEPTION 'Admins cannot revoke their own privileges';
    END IF;
    
    -- Update the user's admin status
    UPDATE users SET is_admin = false WHERE id = target_user_id;
    
    -- Log the action
    INSERT INTO admin_audit_log (admin_id, action, target_user_id, details)
    VALUES (revoked_by, 'REVOKE_ADMIN', target_user_id, jsonb_build_object('revoked_at', NOW()));
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Example: Grant admin to specific user (replace with actual email)
-- SELECT grant_admin_privileges(
--     (SELECT id FROM users WHERE email = 'newadmin@example.com'),
--     auth.uid()
-- );