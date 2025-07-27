-- Add lasso_capture_enabled column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS lasso_capture_enabled BOOLEAN DEFAULT TRUE;

-- Update the column comment for documentation
COMMENT ON COLUMN users.lasso_capture_enabled IS 'Whether lasso capture mode is enabled for the user. If false, only double-tap capture is available.';