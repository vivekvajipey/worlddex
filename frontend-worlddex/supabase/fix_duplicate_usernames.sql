-- Function to assign unique usernames to existing users
-- Run this FIRST to fix duplicates
CREATE OR REPLACE FUNCTION assign_unique_usernames_to_users()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  new_username TEXT;
BEGIN
  -- Loop through users who need new usernames
  FOR user_record IN 
    SELECT id, username 
    FROM public.users 
    WHERE username LIKE '% %' -- Has space (full name)
       OR username = email    -- Username is email
       OR username IN (      -- Or has duplicates
         SELECT username 
         FROM public.users 
         GROUP BY username 
         HAVING COUNT(*) > 1
       )
  LOOP
    -- Get a random available username
    new_username := public.get_random_available_username();
    
    -- If no username available from pool, generate fallback
    IF new_username IS NULL THEN
      new_username := 'Player' || substring(user_record.id::text, 1, 8);
    END IF;
    
    -- Update the user with their new unique username
    UPDATE public.users 
    SET 
      display_name = CASE 
        WHEN display_name IS NULL THEN username 
        ELSE display_name 
      END,
      username = new_username
    WHERE id = user_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the function to fix usernames
SELECT assign_unique_usernames_to_users();

-- NOW add the unique constraint after duplicates are fixed
ALTER TABLE public.users 
ADD CONSTRAINT users_username_unique UNIQUE (username);

-- Drop the function after use
DROP FUNCTION assign_unique_usernames_to_users();