-- Update the get_user_capture_counts RPC function to exclude soft deleted captures
CREATE OR REPLACE FUNCTION get_user_capture_counts()
RETURNS TABLE(
    user_id UUID,
    capture_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT c.user_id, COUNT(*) as capture_count
    FROM captures c
    WHERE c.deleted_at IS NULL  -- Exclude soft deleted captures
    GROUP BY c.user_id;
END;
$$ LANGUAGE plpgsql;