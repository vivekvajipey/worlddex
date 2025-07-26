-- RPC Functions for WorldDex
-- Execute these in your Supabase SQL editor after creating the tables

-- Function to finalize an auction
CREATE OR REPLACE FUNCTION finalize_auction(p_listing_id UUID)
RETURNS VOID AS $$
DECLARE
    v_listing listings%ROWTYPE;
    v_highest_bid bids%ROWTYPE;
BEGIN
    -- Get listing details
    SELECT * INTO v_listing FROM listings WHERE id = p_listing_id;
    
    -- Get highest bid
    SELECT * INTO v_highest_bid FROM bids 
    WHERE listing_id = p_listing_id 
    ORDER BY amount DESC 
    LIMIT 1;
    
    -- Process auction completion logic here
    -- Update listing status, create transaction, transfer ownership, etc.
    UPDATE listings SET status = 'completed' WHERE id = p_listing_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check and process expired auctions
CREATE OR REPLACE FUNCTION check_expired_auctions_directly()
RETURNS VOID AS $$
BEGIN
    -- Mark expired listings
    UPDATE listings 
    SET status = 'expired' 
    WHERE expires_at < NOW() 
    AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Function to retract a bid
CREATE OR REPLACE FUNCTION retract_bid(p_listing_id UUID, p_bidder_id UUID)
RETURNS VOID AS $$
BEGIN
    DELETE FROM bids 
    WHERE listing_id = p_listing_id 
    AND bidder_id = p_bidder_id;
END;
$$ LANGUAGE plpgsql;

-- Function to process buy now purchase
CREATE OR REPLACE FUNCTION process_buy_now_purchase(p_listing_id UUID, p_buyer_id UUID)
RETURNS VOID AS $$
DECLARE
    v_listing listings%ROWTYPE;
    v_seller users%ROWTYPE;
    v_buyer users%ROWTYPE;
BEGIN
    -- Get listing details
    SELECT * INTO v_listing FROM listings WHERE id = p_listing_id;
    
    -- Get seller and buyer details
    SELECT * INTO v_seller FROM users WHERE id = v_listing.seller_id;
    SELECT * INTO v_buyer FROM users WHERE id = p_buyer_id;
    
    -- Check if buyer has enough balance
    IF v_buyer.balance < v_listing.price THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;
    
    -- Process transaction
    -- Update balances
    UPDATE users SET balance = balance - v_listing.price WHERE id = p_buyer_id;
    UPDATE users SET balance = balance + v_listing.price WHERE id = v_listing.seller_id;
    
    -- Create transaction record
    INSERT INTO transactions (listing_id, buyer_id, seller_id, transaction_type, coins_amount)
    VALUES (p_listing_id, p_buyer_id, v_listing.seller_id, 'buy_now', v_listing.price);
    
    -- Update listing status
    UPDATE listings SET status = 'completed' WHERE id = p_listing_id;
    
    -- Transfer capture ownership
    UPDATE captures 
    SET last_owner_id = p_buyer_id 
    WHERE id IN (SELECT capture_id FROM listing_items WHERE listing_id = p_listing_id);
END;
$$ LANGUAGE plpgsql;

-- Function to accept trade offer
CREATE OR REPLACE FUNCTION accept_trade_offer(p_trade_offer_id UUID, p_seller_id UUID)
RETURNS VOID AS $$
DECLARE
    v_trade_offer trade_offers%ROWTYPE;
    v_listing listings%ROWTYPE;
BEGIN
    -- Get trade offer details
    SELECT * INTO v_trade_offer FROM trade_offers WHERE id = p_trade_offer_id;
    
    -- Get listing details
    SELECT * INTO v_listing FROM listings WHERE id = v_trade_offer.listing_id;
    
    -- Verify seller owns the listing
    IF v_listing.seller_id != p_seller_id THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;
    
    -- Process trade
    -- Update trade offer status
    UPDATE trade_offers SET status = 'accepted' WHERE id = p_trade_offer_id;
    
    -- Create transaction
    INSERT INTO transactions (listing_id, buyer_id, seller_id, transaction_type, trade_offer_id)
    VALUES (v_listing.id, v_trade_offer.offerer_id, p_seller_id, 'trade', p_trade_offer_id);
    
    -- Transfer captures both ways
    -- Transfer seller's captures to buyer
    UPDATE captures 
    SET last_owner_id = v_trade_offer.offerer_id 
    WHERE id IN (SELECT capture_id FROM listing_items WHERE listing_id = v_listing.id);
    
    -- Transfer buyer's offered captures to seller
    UPDATE captures 
    SET last_owner_id = p_seller_id 
    WHERE id IN (SELECT capture_id FROM trade_offer_items WHERE trade_offer_id = p_trade_offer_id);
    
    -- Update listing status
    UPDATE listings SET status = 'completed' WHERE id = v_listing.id;
END;
$$ LANGUAGE plpgsql;

-- Function to increment user balance
CREATE OR REPLACE FUNCTION increment_user_balance(user_id UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE users SET balance = balance + amount WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get preview comments
CREATE OR REPLACE FUNCTION get_preview_comments(_capture_ids UUID[], _limit INTEGER)
RETURNS TABLE(
    capture_id UUID,
    comment_text TEXT,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT c.capture_id, c.comment_text, c.user_id, c.created_at
    FROM comments c
    WHERE c.capture_id = ANY(_capture_ids)
    ORDER BY c.created_at DESC
    LIMIT _limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get collection top users
CREATE OR REPLACE FUNCTION get_collection_top_users(collection_id_param UUID, limit_param INTEGER)
RETURNS TABLE(
    user_id UUID,
    items_collected BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT uci.user_id, COUNT(*) as items_collected
    FROM user_collection_items uci
    WHERE uci.collection_id = collection_id_param
    GROUP BY uci.user_id
    ORDER BY items_collected DESC
    LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Function to retract trade offer
CREATE OR REPLACE FUNCTION retract_trade_offer(p_trade_offer_id UUID, p_trader_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE trade_offers 
    SET status = 'retracted' 
    WHERE id = p_trade_offer_id 
    AND offerer_id = p_trader_id;
END;
$$ LANGUAGE plpgsql;

-- Function to place bid
CREATE OR REPLACE FUNCTION place_bid(p_listing_id UUID, p_bidder_id UUID, p_amount NUMERIC)
RETURNS VOID AS $$
BEGIN
    -- Insert or update bid
    INSERT INTO bids (listing_id, bidder_id, amount)
    VALUES (p_listing_id, p_bidder_id, p_amount)
    ON CONFLICT (listing_id, bidder_id) 
    DO UPDATE SET amount = p_amount, updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to finalize expired listings
CREATE OR REPLACE FUNCTION finalize_expired_listings()
RETURNS VOID AS $$
BEGIN
    -- Process all expired listings
    UPDATE listings 
    SET status = 'expired', completed_at = NOW()
    WHERE expires_at < NOW() 
    AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Function to update trade offer
CREATE OR REPLACE FUNCTION update_trade_offer(
    p_trade_offer_id UUID, 
    p_offered_capture_ids UUID[], 
    p_message TEXT
)
RETURNS VOID AS $$
BEGIN
    -- Update trade offer message
    UPDATE trade_offers 
    SET message = p_message, updated_at = NOW()
    WHERE id = p_trade_offer_id;
    
    -- Delete old offered items
    DELETE FROM trade_offer_items WHERE trade_offer_id = p_trade_offer_id;
    
    -- Insert new offered items
    INSERT INTO trade_offer_items (trade_offer_id, capture_id)
    SELECT p_trade_offer_id, unnest(p_offered_capture_ids);
END;
$$ LANGUAGE plpgsql;

-- Function to place trade offer
CREATE OR REPLACE FUNCTION place_trade_offer(
    p_listing_id UUID, 
    p_trader_id UUID, 
    p_offered_capture_ids UUID[], 
    p_message TEXT
)
RETURNS UUID AS $$
DECLARE
    v_trade_offer_id UUID;
BEGIN
    -- Create trade offer
    INSERT INTO trade_offers (listing_id, offerer_id, message)
    VALUES (p_listing_id, p_trader_id, p_message)
    RETURNING id INTO v_trade_offer_id;
    
    -- Insert offered items
    INSERT INTO trade_offer_items (trade_offer_id, capture_id)
    SELECT v_trade_offer_id, unnest(p_offered_capture_ids);
    
    RETURN v_trade_offer_id;
END;
$$ LANGUAGE plpgsql;

-- Function to finalize abandoned auctions
CREATE OR REPLACE FUNCTION finalize_abandoned_auctions()
RETURNS VOID AS $$
BEGIN
    -- Mark auctions without bids as abandoned
    UPDATE listings 
    SET status = 'abandoned'
    WHERE expires_at < NOW() 
    AND status = 'active'
    AND NOT EXISTS (SELECT 1 FROM bids WHERE listing_id = listings.id);
END;
$$ LANGUAGE plpgsql;

-- Function to get user capture counts
CREATE OR REPLACE FUNCTION get_user_capture_counts()
RETURNS TABLE(
    user_id UUID,
    capture_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT c.user_id, COUNT(*) as capture_count
    FROM captures c
    GROUP BY c.user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to delete listing with cleanup
CREATE OR REPLACE FUNCTION delete_listing_with_cleanup(p_listing_id UUID, p_seller_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Verify ownership
    IF NOT EXISTS (SELECT 1 FROM listings WHERE id = p_listing_id AND seller_id = p_seller_id) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;
    
    -- Delete related records
    DELETE FROM bids WHERE listing_id = p_listing_id;
    DELETE FROM trade_offer_items WHERE trade_offer_id IN (SELECT id FROM trade_offers WHERE listing_id = p_listing_id);
    DELETE FROM trade_offers WHERE listing_id = p_listing_id;
    DELETE FROM listing_items WHERE listing_id = p_listing_id;
    DELETE FROM listings WHERE id = p_listing_id;
END;
$$ LANGUAGE plpgsql;

-- Function to reject trade offer
CREATE OR REPLACE FUNCTION reject_trade_offer(p_trade_offer_id UUID, p_seller_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE trade_offers 
    SET status = 'rejected'
    WHERE id = p_trade_offer_id
    AND listing_id IN (SELECT id FROM listings WHERE seller_id = p_seller_id);
END;
$$ LANGUAGE plpgsql;

-- Function to reset daily captures
CREATE OR REPLACE FUNCTION reset_daily_captures_directly()
RETURNS VOID AS $$
BEGIN
    UPDATE users SET daily_captures_used = 0;
END;
$$ LANGUAGE plpgsql;