-- Add display_name column to store real names from OAuth providers
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Update existing users to move their current username to display_name if it looks like a real name
UPDATE public.users
SET display_name = username
WHERE username LIKE '% %' -- Has a space (likely a full name)
   OR username LIKE '%@%'; -- Is an email address