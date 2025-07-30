-- Add columns for tracking identify API attempts
ALTER TABLE users 
ADD COLUMN daily_identify_attempts INTEGER DEFAULT 0,
ADD COLUMN total_identify_attempts INTEGER DEFAULT 0;

-- Create index for efficient querying
CREATE INDEX idx_users_daily_identify_attempts ON users(daily_identify_attempts);

-- Update the daily reset function to also reset identify attempts
CREATE OR REPLACE FUNCTION reset_daily_counts() RETURNS void AS $$
BEGIN
  UPDATE users 
  SET daily_captures_used = 0,
      daily_identify_attempts = 0
  WHERE daily_captures_used > 0 OR daily_identify_attempts > 0;
END;
$$ LANGUAGE plpgsql;