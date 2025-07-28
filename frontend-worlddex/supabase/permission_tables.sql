-- Permission System Tables for WorldDex
-- Run this migration to add permission tracking capabilities

-- Add permission-related columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS permission_preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_notification_prompt TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create permission events table for analytics
CREATE TABLE IF NOT EXISTS permission_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    permission_type TEXT NOT NULL CHECK (permission_type IN ('camera', 'location', 'notification', 'photoLibrary')),
    event_type TEXT NOT NULL CHECK (event_type IN ('primer_shown', 'primer_allowed', 'primer_denied', 'native_granted', 'native_denied', 'settings_redirect')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    
    -- Useful for tracking conversion funnels
    session_id TEXT,
    app_version TEXT
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_permission_events_user_type ON permission_events(user_id, permission_type);
CREATE INDEX IF NOT EXISTS idx_permission_events_created ON permission_events(created_at);
CREATE INDEX IF NOT EXISTS idx_permission_events_type_event ON permission_events(permission_type, event_type);

-- Create a view for permission analytics
CREATE OR REPLACE VIEW permission_analytics AS
SELECT 
    permission_type,
    event_type,
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users
FROM permission_events
GROUP BY permission_type, event_type, DATE_TRUNC('day', created_at);

-- Create a materialized view for permission funnel (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS permission_funnel AS
WITH funnel_data AS (
    SELECT 
        permission_type,
        user_id,
        MAX(CASE WHEN event_type = 'primer_shown' THEN created_at END) as primer_shown_at,
        MAX(CASE WHEN event_type = 'primer_allowed' THEN created_at END) as primer_allowed_at,
        MAX(CASE WHEN event_type = 'primer_denied' THEN created_at END) as primer_denied_at,
        MAX(CASE WHEN event_type = 'native_granted' THEN created_at END) as native_granted_at,
        MAX(CASE WHEN event_type = 'native_denied' THEN created_at END) as native_denied_at
    FROM permission_events
    GROUP BY permission_type, user_id
)
SELECT 
    permission_type,
    COUNT(DISTINCT user_id) as total_users,
    COUNT(DISTINCT CASE WHEN primer_shown_at IS NOT NULL THEN user_id END) as primer_shown,
    COUNT(DISTINCT CASE WHEN primer_allowed_at IS NOT NULL THEN user_id END) as primer_allowed,
    COUNT(DISTINCT CASE WHEN primer_denied_at IS NOT NULL THEN user_id END) as primer_denied,
    COUNT(DISTINCT CASE WHEN native_granted_at IS NOT NULL THEN user_id END) as native_granted,
    COUNT(DISTINCT CASE WHEN native_denied_at IS NOT NULL THEN user_id END) as native_denied,
    
    -- Conversion rates
    ROUND(
        COUNT(DISTINCT CASE WHEN primer_allowed_at IS NOT NULL THEN user_id END)::numeric / 
        NULLIF(COUNT(DISTINCT CASE WHEN primer_shown_at IS NOT NULL THEN user_id END), 0) * 100, 
        2
    ) as primer_acceptance_rate,
    
    ROUND(
        COUNT(DISTINCT CASE WHEN native_granted_at IS NOT NULL THEN user_id END)::numeric / 
        NULLIF(COUNT(DISTINCT CASE WHEN primer_allowed_at IS NOT NULL THEN user_id END), 0) * 100, 
        2
    ) as native_grant_rate,
    
    ROUND(
        COUNT(DISTINCT CASE WHEN native_granted_at IS NOT NULL THEN user_id END)::numeric / 
        NULLIF(COUNT(DISTINCT CASE WHEN primer_shown_at IS NOT NULL THEN user_id END), 0) * 100, 
        2
    ) as overall_conversion_rate
FROM funnel_data
GROUP BY permission_type;

-- Function to refresh the materialized view (call this periodically)
CREATE OR REPLACE FUNCTION refresh_permission_funnel()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW permission_funnel;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security
ALTER TABLE permission_events ENABLE ROW LEVEL SECURITY;

-- Users can only see their own permission events
CREATE POLICY "Users can view own permission events" ON permission_events
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own permission events
CREATE POLICY "Users can insert own permission events" ON permission_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to get user's permission history
CREATE OR REPLACE FUNCTION get_user_permission_history(p_user_id UUID)
RETURNS TABLE (
    permission_type TEXT,
    last_requested TIMESTAMP WITH TIME ZONE,
    status TEXT,
    primer_shown_count BIGINT,
    soft_denied BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pe.permission_type,
        MAX(pe.created_at) as last_requested,
        CASE 
            WHEN MAX(CASE WHEN pe.event_type = 'native_granted' THEN pe.created_at END) IS NOT NULL THEN 'granted'
            WHEN MAX(CASE WHEN pe.event_type = 'native_denied' THEN pe.created_at END) IS NOT NULL THEN 'denied'
            ELSE 'undetermined'
        END as status,
        COUNT(DISTINCT CASE WHEN pe.event_type = 'primer_shown' THEN pe.created_at END) as primer_shown_count,
        MAX(CASE WHEN pe.event_type = 'primer_denied' THEN pe.created_at END) IS NOT NULL 
            AND MAX(CASE WHEN pe.event_type = 'native_granted' THEN pe.created_at END) IS NULL as soft_denied
    FROM permission_events pe
    WHERE pe.user_id = p_user_id
    GROUP BY pe.permission_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT ON permission_analytics TO authenticated;
GRANT SELECT ON permission_funnel TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_permission_history TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_permission_funnel TO service_role;