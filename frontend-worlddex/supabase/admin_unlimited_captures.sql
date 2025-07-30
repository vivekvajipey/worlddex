-- Simple Admin Implementation for Unlimited Captures

-- 1. Add is_admin column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- 4. Create basic RLS policies
CREATE POLICY "Users can view all users" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- 5. Create trigger to prevent users from making themselves admin
CREATE OR REPLACE FUNCTION prevent_self_admin()
RETURNS TRIGGER AS $$
BEGIN
    -- If a non-admin user is trying to make themselves admin
    IF NEW.is_admin = true AND OLD.is_admin = false THEN
        -- Check if the current user is already an admin
        IF NOT EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND is_admin = true
            AND id != NEW.id  -- Not checking their own record
        ) THEN
            -- Revert the change
            NEW.is_admin := false;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_self_admin_trigger ON users;

CREATE TRIGGER prevent_self_admin_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION prevent_self_admin();

-- 6. Create index for admin lookups
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;

-- 7. Simple function to check if user can capture
CREATE OR REPLACE FUNCTION can_user_capture(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_record RECORD;
BEGIN
    SELECT daily_captures_used, is_admin 
    INTO user_record
    FROM users 
    WHERE id = user_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Admins always can capture
    IF user_record.is_admin THEN
        RETURN TRUE;
    END IF;
    
    -- Regular users: 10 capture limit
    RETURN user_record.daily_captures_used < 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- To make someone an admin, run this in Supabase SQL editor:
-- UPDATE users SET is_admin = true WHERE email = 'your-email@example.com';