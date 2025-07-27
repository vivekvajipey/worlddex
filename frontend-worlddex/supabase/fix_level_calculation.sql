-- Fix for XP level calculation
-- The previous function had an off-by-one error

-- Drop and recreate the function with correct logic
CREATE OR REPLACE FUNCTION calculate_level_from_xp(xp_amount INTEGER)
RETURNS INTEGER AS $$
DECLARE
    current_level INTEGER := 1;
    xp_needed INTEGER := 50; -- XP needed for level 2
BEGIN
    -- Level progression: Level N needs (1*50 + 2*50 + ... + (N-1)*50) total XP
    WHILE xp_amount >= xp_needed LOOP
        current_level := current_level + 1;
        xp_needed := xp_needed + (current_level * 50);
    END LOOP;
    
    RETURN current_level;
END;
$$ LANGUAGE plpgsql;

-- Update all users' levels based on their current XP
UPDATE users 
SET level = calculate_level_from_xp(xp);

-- Verify the calculation works correctly
-- Level 1: 0-49 XP
-- Level 2: 50-149 XP  
-- Level 3: 150-299 XP
-- Level 4: 300-499 XP
-- etc.