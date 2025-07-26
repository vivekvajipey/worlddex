-- WorldDex Database Schema
-- This schema recreates all tables and structures from Supabase project: ofscqkmlxazmkvpkhdjm
-- Generated from API documentation

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    email TEXT NOT NULL,
    username TEXT NOT NULL,
    profile_picture_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reputation_points INTEGER DEFAULT 0,
    capture_tier INTEGER DEFAULT 1,
    daily_captures_used INTEGER DEFAULT 0,
    capture_streak INTEGER DEFAULT 0,
    is_onboarded BOOLEAN DEFAULT FALSE, -- have they onboarded
    default_public_captures BOOLEAN DEFAULT FALSE,
    balance INTEGER DEFAULT 15 NOT NULL
);

-- Collections table
CREATE TABLE collections (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    cover_photo_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    is_featured BOOLEAN DEFAULT FALSE
);

-- All items table
CREATE TABLE all_items (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    global_rarity TEXT,
    total_captures INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Collection items table
CREATE TABLE collection_items (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    collection_id UUID REFERENCES collections(id),
    item_id UUID,
    silhouette_key TEXT NOT NULL,
    is_secret_rare BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    location GEOGRAPHY(POINT, 4326),
    display_name TEXT DEFAULT '' NOT NULL,
    name TEXT DEFAULT '' NOT NULL,
    thumb_key TEXT
);

-- Captures table
CREATE TABLE captures (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    item_id UUID REFERENCES all_items(id),
    item_name TEXT NOT NULL,
    capture_number INTEGER NOT NULL,
    image_key TEXT NOT NULL,
    segmented_image_key TEXT NOT NULL,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    location GEOGRAPHY(POINT, 4326),
    like_count INTEGER DEFAULT 0,
    daily_upvotes INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT FALSE,
    comment_count BIGINT,
    thumb_key TEXT,
    last_owner_id UUID REFERENCES users(id),
    transaction_type TEXT,
    rarity_tier TEXT DEFAULT 'common' NOT NULL,
    rarity_score INTEGER
);

-- User collections table
CREATE TABLE user_collections (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    collection_id UUID REFERENCES collections(id),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    collected_reward BOOLEAN DEFAULT FALSE
);

-- User collection items table
CREATE TABLE user_collection_items (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    collection_item_id UUID REFERENCES collection_items(id),
    capture_id UUID REFERENCES captures(id),
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    item_id UUID REFERENCES all_items(id),
    collection_id UUID REFERENCES collections(id)
);

-- Listings table
CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    listing_type CHARACTER VARYING(10) NOT NULL,
    auction_type CHARACTER VARYING(20),
    price INTEGER,
    status CHARACTER VARYING(10) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    reserve_price INTEGER
);

-- Listing items table
CREATE TABLE listing_items (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id),
    capture_id UUID NOT NULL REFERENCES captures(id)
);

-- Bids table
CREATE TABLE bids (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id),
    bidder_id UUID NOT NULL REFERENCES users(id),
    amount INTEGER NOT NULL,
    status CHARACTER VARYING(10) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trade offers table
CREATE TABLE trade_offers (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES listings(id),
    offerer_id UUID NOT NULL REFERENCES users(id),
    status CHARACTER VARYING(10) DEFAULT 'pending',
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trade offer items table
CREATE TABLE trade_offer_items (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    trade_offer_id UUID NOT NULL REFERENCES trade_offers(id),
    capture_id UUID NOT NULL REFERENCES captures(id)
);

-- Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    listing_id UUID REFERENCES listings(id),
    buyer_id UUID NOT NULL REFERENCES users(id),
    seller_id UUID NOT NULL REFERENCES users(id),
    transaction_type CHARACTER VARYING(20) NOT NULL,
    coins_amount INTEGER DEFAULT 0,
    trade_offer_id UUID REFERENCES trade_offers(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments table (capture comments)
CREATE TABLE comments (
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES users(id),
    capture_id UUID REFERENCES captures(id),
    comment_text TEXT,
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES listings(id)
);

-- Likes table (capture likes)
CREATE TABLE likes (
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    capture_id UUID NOT NULL REFERENCES captures(id),
    user_id UUID NOT NULL REFERENCES users(id),
    PRIMARY KEY (capture_id, user_id)
);

-- RPC Functions (Stored Procedures)
-- Note: These are the functions available via RPC calls in your Supabase project
-- You would need to recreate these as PostgreSQL functions

/*
Available RPC Functions:
- finalize_auction(p_listing_id UUID)
- check_expired_auctions_directly()
- retract_bid(p_listing_id UUID, p_bidder_id UUID)
- process_buy_now_purchase(p_listing_id UUID, p_buyer_id UUID)
- accept_trade_offer(p_trade_offer_id UUID, p_seller_id UUID)
- increment_user_balance(user_id UUID, amount INTEGER)
- get_preview_comments(_capture_ids UUID[], _limit INTEGER)
- get_collection_top_users(collection_id_param UUID, limit_param INTEGER)
- retract_trade_offer(p_trade_offer_id UUID, p_trader_id UUID)
- place_bid(p_listing_id UUID, p_bidder_id UUID, p_amount NUMERIC)
- finalize_expired_listings()
- update_trade_offer(p_trade_offer_id UUID, p_offered_capture_ids UUID[], p_message TEXT)
- place_trade_offer(p_listing_id UUID, p_trader_id UUID, p_offered_capture_ids UUID[], p_message TEXT)
- finalize_abandoned_auctions()
- get_user_capture_counts()
- delete_listing_with_cleanup(p_listing_id UUID, p_seller_id UUID)
- reject_trade_offer(p_trade_offer_id UUID, p_seller_id UUID)
- reset_daily_captures_directly()
*/

-- Indexes (you may want to add these based on your query patterns)
CREATE INDEX idx_captures_user_id ON captures(user_id);
CREATE INDEX idx_captures_item_id ON captures(item_id);
CREATE INDEX idx_captures_captured_at ON captures(captured_at);
CREATE INDEX idx_listings_seller_id ON listings(seller_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_bids_listing_id ON bids(listing_id);
CREATE INDEX idx_bids_bidder_id ON bids(bidder_id);
CREATE INDEX idx_user_collections_user_id ON user_collections(user_id);
CREATE INDEX idx_user_collection_items_user_id ON user_collection_items(user_id);
CREATE INDEX idx_likes_capture_id ON likes(capture_id);
CREATE INDEX idx_comments_capture_id ON comments(capture_id);

-- Row Level Security (RLS) policies would need to be recreated
-- based on your specific security requirements

-- Note: This schema represents the structure as of the API documentation.
-- You may need to adjust data types, constraints, or add additional 
-- business logic constraints based on your specific requirements. 