-- Add is_admin column to users table for privileged access
ALTER TABLE users 
ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

-- Create an index for faster admin user lookups (optional but recommended)
CREATE INDEX idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;

-- Example: Grant admin privileges to specific users (replace with actual user IDs)
-- UPDATE users SET is_admin = TRUE WHERE email = 'admin@example.com';