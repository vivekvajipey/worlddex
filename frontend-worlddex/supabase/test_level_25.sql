-- Calculate XP needed for level 25
-- Level 25 requires: 1*50 + 2*50 + 3*50 + ... + 24*50
-- This equals: 50 * (1 + 2 + 3 + ... + 24) = 50 * (24 * 25 / 2) = 50 * 300 = 15,000 XP

-- Update your user to level 25 with the exact XP needed
UPDATE users 
SET xp = 15000,
    level = 25
WHERE email = 'vivek.vajipey@gmail.com';

-- Or if you want to be slightly into level 25:
-- UPDATE users 
-- SET xp = 15100,
--     level = 25
-- WHERE email = 'vivek.vajipey@gmail.com';

-- To reset back to your original XP later:
-- UPDATE users 
-- SET xp = 75,
--     level = 2
-- WHERE email = 'vivek.vajipey@gmail.com';