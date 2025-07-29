-- Add fields to track progressive onboarding state
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_circle_shown BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_swipe_shown BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_captures INTEGER DEFAULT 0;

-- Comment on columns
COMMENT ON COLUMN users.is_onboarded IS 'True when user has completed initial onboarding (double-tap tutorial)';
COMMENT ON COLUMN users.onboarding_circle_shown IS 'True when circle drawing tutorial has been shown';
COMMENT ON COLUMN users.onboarding_swipe_shown IS 'True when swipe gesture tutorial has been shown';
COMMENT ON COLUMN users.total_captures IS 'Total number of captures made by user (for progressive onboarding triggers)';