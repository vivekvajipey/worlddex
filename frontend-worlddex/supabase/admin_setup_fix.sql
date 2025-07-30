-- Fix for setting up the first admin

-- 1. First, drop the existing trigger that's blocking us
DROP TRIGGER IF EXISTS prevent_self_admin_trigger ON users;
DROP FUNCTION IF EXISTS prevent_self_admin();

-- 2. Create a modified trigger that allows setting the first admin
CREATE OR REPLACE FUNCTION prevent_self_admin()
RETURNS TRIGGER AS $$
DECLARE
    admin_count INTEGER;
BEGIN
    -- Count existing admins
    SELECT COUNT(*) INTO admin_count FROM users WHERE is_admin = true;
    
    -- If there are no admins yet, allow the first one to be created
    IF admin_count = 0 THEN
        RETURN NEW;
    END IF;
    
    -- If a non-admin user is trying to make themselves admin
    IF NEW.is_admin = true AND OLD.is_admin = false THEN
        -- Check if the current user is already an admin
        IF auth.uid() IS NOT NULL AND NOT EXISTS (
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

-- 3. Recreate the trigger
CREATE TRIGGER prevent_self_admin_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION prevent_self_admin();

-- 4. Now you can set yourself as the first admin
UPDATE users SET is_admin = true WHERE email = 'vivek.vajipey@gmail.com';

-- 5. Verify it worked
SELECT id, email, username, is_admin FROM users WHERE email = 'vivek.vajipey@gmail.com';