-- Trigger to automatically create user record on signup
-- This ensures that when someone signs up via Google OAuth (or any auth method),
-- a corresponding record is created in the public.users table

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  random_username TEXT;
BEGIN
  -- Get a random available username from the pool
  random_username := public.get_random_available_username();
  
  -- If no username available from pool, generate a fallback
  IF random_username IS NULL THEN
    random_username := 'Player' || substring(new.id::text, 1, 8);
  END IF;
  
  INSERT INTO public.users (
    id,
    email,
    username,
    display_name,
    created_at,
    reputation_points,
    capture_tier,
    daily_captures_used,
    capture_streak,
    is_onboarded,
    default_public_captures,
    balance
  )
  VALUES (
    new.id,
    new.email,
    random_username,
    new.raw_user_meta_data->>'name', -- Store OAuth name separately
    now(),
    0,
    1,
    0,
    0,
    false,
    false,
    15
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also handle case where auth user exists but public user doesn't
-- This is useful for existing auth users who don't have a public.users record
CREATE OR REPLACE FUNCTION public.ensure_user_exists()
RETURNS void AS $$
DECLARE
  auth_user auth.users%ROWTYPE;
BEGIN
  -- Get all auth users
  FOR auth_user IN SELECT * FROM auth.users LOOP
    -- Insert if not exists
    INSERT INTO public.users (
      id,
      email,
      username,
      created_at,
      reputation_points,
      capture_tier,
      daily_captures_used,
      capture_streak,
      is_onboarded,
      default_public_captures,
      balance
    )
    VALUES (
      auth_user.id,
      auth_user.email,
      COALESCE(auth_user.raw_user_meta_data->>'name', auth_user.email),
      COALESCE(auth_user.created_at, now()),
      0,
      1,
      0,
      0,
      false,
      false,
      15
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run this function once to create records for any existing auth users
SELECT public.ensure_user_exists();