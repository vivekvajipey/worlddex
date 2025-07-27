-- XP Leveling System Migration
-- This migration adds XP and level tracking to the WorldDex database

-- Add XP and level columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1 NOT NULL;

-- Create XP transactions table for tracking XP history
CREATE TABLE IF NOT EXISTS xp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    capture_id UUID REFERENCES captures(id) ON DELETE SET NULL,
    collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create level rewards table
CREATE TABLE IF NOT EXISTS level_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level INTEGER NOT NULL UNIQUE,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('badge', 'filter', 'capture_limit', 'title')),
    reward_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON xp_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_users_level ON users(level);
CREATE INDEX IF NOT EXISTS idx_users_xp ON users(xp);

-- Insert some initial level rewards
INSERT INTO level_rewards (level, reward_type, reward_value, description) VALUES
(5, 'filter', 'vintage', 'Unlock the Vintage camera filter'),
(10, 'capture_limit', '+5', 'Increase daily capture limit by 5'),
(10, 'filter', 'noir', 'Unlock the Noir camera filter'),
(15, 'filter', 'vibrant', 'Unlock the Vibrant camera filter'),
(20, 'capture_limit', '+5', 'Increase daily capture limit by 5'),
(25, 'badge', 'Explorer', 'Earn the Explorer badge'),
(30, 'capture_limit', '+10', 'Increase daily capture limit by 10'),
(50, 'badge', 'Collector', 'Earn the Collector badge'),
(50, 'title', 'Master Explorer', 'Unlock the Master Explorer title'),
(100, 'badge', 'Legend', 'Earn the Legend badge'),
(100, 'title', 'WorldDex Legend', 'Unlock the WorldDex Legend title')
ON CONFLICT (level) DO NOTHING;

-- Create function to calculate level from XP
CREATE OR REPLACE FUNCTION calculate_level_from_xp(xp_amount INTEGER)
RETURNS INTEGER AS $$
DECLARE
    current_level INTEGER := 1;
    xp_needed INTEGER := 0;
BEGIN
    -- Level progression: Level N needs Previous + (N * 50) XP
    WHILE xp_amount >= xp_needed LOOP
        current_level := current_level + 1;
        xp_needed := xp_needed + (current_level * 50);
    END LOOP;
    
    RETURN current_level - 1;
END;
$$ LANGUAGE plpgsql;

-- Create function to get XP needed for next level
CREATE OR REPLACE FUNCTION get_xp_for_next_level(current_level INTEGER)
RETURNS INTEGER AS $$
DECLARE
    xp_total INTEGER := 0;
    level_counter INTEGER := 1;
BEGIN
    WHILE level_counter <= current_level LOOP
        xp_total := xp_total + (level_counter * 50);
        level_counter := level_counter + 1;
    END LOOP;
    
    RETURN xp_total;
END;
$$ LANGUAGE plpgsql;

-- Create function to award XP to a user
CREATE OR REPLACE FUNCTION award_xp(
    p_user_id UUID,
    p_amount INTEGER,
    p_reason TEXT,
    p_capture_id UUID DEFAULT NULL,
    p_collection_id UUID DEFAULT NULL
)
RETURNS TABLE(new_xp INTEGER, new_level INTEGER, level_up BOOLEAN) AS $$
DECLARE
    current_xp INTEGER;
    current_level INTEGER;
    new_xp_total INTEGER;
    new_level_calc INTEGER;
BEGIN
    -- Get current XP and level
    SELECT xp, level INTO current_xp, current_level
    FROM users
    WHERE id = p_user_id;
    
    -- Calculate new XP total
    new_xp_total := current_xp + p_amount;
    
    -- Calculate new level
    new_level_calc := calculate_level_from_xp(new_xp_total);
    
    -- Update user's XP and level
    UPDATE users 
    SET xp = new_xp_total, 
        level = new_level_calc
    WHERE id = p_user_id;
    
    -- Record the transaction
    INSERT INTO xp_transactions (user_id, amount, reason, capture_id, collection_id)
    VALUES (p_user_id, p_amount, p_reason, p_capture_id, p_collection_id);
    
    -- Return the results
    RETURN QUERY SELECT 
        new_xp_total as new_xp,
        new_level_calc as new_level,
        (new_level_calc > current_level) as level_up;
END;
$$ LANGUAGE plpgsql;

-- Create view for user level progress
CREATE OR REPLACE VIEW user_level_progress AS
SELECT 
    u.id,
    u.username,
    u.xp,
    u.level,
    get_xp_for_next_level(u.level) - u.xp as xp_to_next_level,
    CASE 
        WHEN u.level = 1 THEN u.xp::FLOAT / 50.0
        ELSE (u.xp - get_xp_for_next_level(u.level - 1))::FLOAT / 
             ((u.level + 1) * 50)::FLOAT
    END as level_progress_percentage
FROM users u;

-- Row Level Security for new tables
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for xp_transactions
CREATE POLICY "Users can view their own XP transactions" ON xp_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert XP transactions" ON xp_transactions
    FOR INSERT WITH CHECK (true);

-- RLS Policies for level_rewards (everyone can view)
CREATE POLICY "Everyone can view level rewards" ON level_rewards
    FOR SELECT USING (true);

-- Grant necessary permissions
GRANT SELECT ON user_level_progress TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_level_from_xp TO authenticated;
GRANT EXECUTE ON FUNCTION get_xp_for_next_level TO authenticated;
GRANT EXECUTE ON FUNCTION award_xp TO authenticated;