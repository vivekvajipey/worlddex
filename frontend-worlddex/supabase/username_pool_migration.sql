-- Create username pool table (simpler version)
CREATE TABLE IF NOT EXISTS public.username_pool (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster random selection
CREATE INDEX idx_username_pool_username ON public.username_pool (username);

-- Function to get a random available username
-- This checks against actual users table for current usage
CREATE OR REPLACE FUNCTION public.get_random_available_username()
RETURNS TEXT AS $$
DECLARE
  selected_username TEXT;
BEGIN
  -- Select a random username that's not currently in use
  SELECT up.username INTO selected_username
  FROM public.username_pool up
  WHERE NOT EXISTS (
    SELECT 1 FROM public.users u 
    WHERE LOWER(u.username) = LOWER(up.username)
  )
  ORDER BY RANDOM()
  LIMIT 1;
  
  -- Return the username (or NULL if none available)
  RETURN selected_username;
END;
$$ LANGUAGE plpgsql;

-- Optional: Function to bulk insert usernames from your txt file
-- You can use this after creating the table
CREATE OR REPLACE FUNCTION public.bulk_insert_usernames(usernames TEXT[])
RETURNS void AS $$
BEGIN
  INSERT INTO public.username_pool (username)
  SELECT UNNEST(usernames)
  ON CONFLICT (username) DO NOTHING;
END;
$$ LANGUAGE plpgsql;