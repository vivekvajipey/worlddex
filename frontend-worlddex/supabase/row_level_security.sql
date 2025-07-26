-- Row Level Security Policies for WorldDex
-- Execute these in your Supabase SQL editor after creating the tables and RPC functions

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE all_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_offer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view all users" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Collections table policies
CREATE POLICY "Anyone can view collections" ON collections
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create collections" ON collections
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Collection creators can update their collections" ON collections
    FOR UPDATE USING (auth.uid() = created_by);

-- All items table policies
CREATE POLICY "Anyone can view all items" ON all_items
    FOR SELECT USING (true);

-- Collection items table policies
CREATE POLICY "Anyone can view collection items" ON collection_items
    FOR SELECT USING (true);

-- Captures table policies
CREATE POLICY "View public captures or own captures" ON captures
    FOR SELECT USING (is_public = true OR user_id = auth.uid() OR last_owner_id = auth.uid());

CREATE POLICY "Users can create their own captures" ON captures
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own captures" ON captures
    FOR UPDATE USING (user_id = auth.uid() OR last_owner_id = auth.uid());

-- User collections table policies
CREATE POLICY "Users can view their own collections" ON user_collections
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can add collections to their profile" ON user_collections
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own collection status" ON user_collections
    FOR UPDATE USING (user_id = auth.uid());

-- User collection items table policies
CREATE POLICY "Users can view their own collection items" ON user_collection_items
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can add items to their collections" ON user_collection_items
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Listings table policies
CREATE POLICY "Anyone can view active listings" ON listings
    FOR SELECT USING (status = 'active' OR seller_id = auth.uid());

CREATE POLICY "Users can create their own listings" ON listings
    FOR INSERT WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Users can update their own listings" ON listings
    FOR UPDATE USING (seller_id = auth.uid());

CREATE POLICY "Users can delete their own listings" ON listings
    FOR DELETE USING (seller_id = auth.uid());

-- Listing items table policies
CREATE POLICY "Anyone can view listing items" ON listing_items
    FOR SELECT USING (true);

CREATE POLICY "Listing owners can add items" ON listing_items
    FOR INSERT WITH CHECK (
        listing_id IN (SELECT id FROM listings WHERE seller_id = auth.uid())
    );

-- Bids table policies
CREATE POLICY "Anyone can view bids" ON bids
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can place bids" ON bids
    FOR INSERT WITH CHECK (bidder_id = auth.uid());

CREATE POLICY "Users can update their own bids" ON bids
    FOR UPDATE USING (bidder_id = auth.uid());

CREATE POLICY "Users can delete their own bids" ON bids
    FOR DELETE USING (bidder_id = auth.uid());

-- Trade offers table policies
CREATE POLICY "View trade offers for own listings or own offers" ON trade_offers
    FOR SELECT USING (
        offerer_id = auth.uid() OR 
        listing_id IN (SELECT id FROM listings WHERE seller_id = auth.uid())
    );

CREATE POLICY "Users can create trade offers" ON trade_offers
    FOR INSERT WITH CHECK (offerer_id = auth.uid());

CREATE POLICY "Users can update their own trade offers" ON trade_offers
    FOR UPDATE USING (offerer_id = auth.uid());

-- Trade offer items table policies
CREATE POLICY "View trade offer items for accessible offers" ON trade_offer_items
    FOR SELECT USING (
        trade_offer_id IN (
            SELECT id FROM trade_offers 
            WHERE offerer_id = auth.uid() OR 
            listing_id IN (SELECT id FROM listings WHERE seller_id = auth.uid())
        )
    );

CREATE POLICY "Users can add items to their trade offers" ON trade_offer_items
    FOR INSERT WITH CHECK (
        trade_offer_id IN (SELECT id FROM trade_offers WHERE offerer_id = auth.uid())
    );

-- Transactions table policies
CREATE POLICY "Users can view their own transactions" ON transactions
    FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- Comments table policies
CREATE POLICY "Anyone can view comments" ON comments
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" ON comments
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own comments" ON comments
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" ON comments
    FOR DELETE USING (user_id = auth.uid());

-- Likes table policies
CREATE POLICY "Anyone can view likes" ON likes
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like captures" ON likes
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their own likes" ON likes
    FOR DELETE USING (user_id = auth.uid());

-- Additional policy for public access to certain user data
CREATE POLICY "Public can view user profiles" ON users
    FOR SELECT USING (true);

-- Policy to allow viewing public captures count
CREATE POLICY "View all public captures for counts" ON captures
    FOR SELECT USING (is_public = true);