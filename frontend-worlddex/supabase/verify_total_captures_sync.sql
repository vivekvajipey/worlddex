-- Verification script to check if total_captures sync is working correctly

-- 1. Show any users where total_captures doesn't match actual capture count
SELECT 
    u.id,
    u.username,
    u.total_captures as stored_total,
    COUNT(c.id) as actual_count,
    u.total_captures - COUNT(c.id) as difference
FROM users u
LEFT JOIN captures c ON c.user_id = u.id AND c.deleted_at IS NULL
GROUP BY u.id, u.username, u.total_captures
HAVING u.total_captures != COUNT(c.id)
ORDER BY ABS(u.total_captures - COUNT(c.id)) DESC;

-- 2. Show top 10 users by total_captures (what leaderboard will show)
SELECT 
    id,
    username,
    total_captures,
    created_at
FROM users
ORDER BY total_captures DESC
LIMIT 10;

-- 3. Compare old RPC method vs new direct query (should be identical)
WITH rpc_counts AS (
    SELECT user_id, capture_count 
    FROM get_user_capture_counts()
),
direct_counts AS (
    SELECT id as user_id, total_captures as capture_count
    FROM users
)
SELECT 
    COALESCE(r.user_id, d.user_id) as user_id,
    r.capture_count as rpc_count,
    d.capture_count as direct_count,
    COALESCE(r.capture_count, 0) - COALESCE(d.capture_count, 0) as difference
FROM rpc_counts r
FULL OUTER JOIN direct_counts d ON r.user_id = d.user_id
WHERE COALESCE(r.capture_count, 0) != COALESCE(d.capture_count, 0)
ORDER BY ABS(COALESCE(r.capture_count, 0) - COALESCE(d.capture_count, 0)) DESC;