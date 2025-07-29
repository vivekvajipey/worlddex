-- Add unique constraint to username column
-- This ensures no two users can have the same username
ALTER TABLE public.users 
ADD CONSTRAINT users_username_unique UNIQUE (username);

-- Also make username not nullable if it isn't already
ALTER TABLE public.users 
ALTER COLUMN username SET NOT NULL;