import { supabase } from "./supabase";

export const Tables = {
  USERS: "users",
  COLLECTIONS: "collections",
  ALL_ITEMS: "all_items",
  COLLECTION_ITEMS: "collection_items",
  CAPTURES: "captures",
  USER_COLLECTION_ITEMS: "user_collection_items",
  USER_COLLECTIONS: "user_collections",
  LISTINGS: "listings",
  LISTING_ITEMS: "listing_items",
  BIDS: "bids",
  TRADE_OFFERS: "trade_offers",
  TRADE_OFFER_ITEMS: "trade_offer_items",
  TRANSACTIONS: "transactions",
  COMMENTS: "comments",
  LIKES: "likes",
};

export { supabase };
