import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

export async function deleteAllUserData(userId: string) {
  if (!userId) throw new Error("User ID is required");

  try {
    // Set last_owner_id to null for all captures referencing this user
    await supabase
      .from("captures")
      .update({ last_owner_id: null })
      .eq("last_owner_id", userId);

    // First delete from tables that reference the user
    await Promise.all([
      // Delete user's captures
      supabase.from("captures").delete().eq("user_id", userId),

      // Delete user's collection items
      supabase.from("user_collection_items").delete().eq("user_id", userId),

      // Delete any collections created by the user
      supabase.from("collections").delete().eq("created_by", userId),

      // Delete user's collections
      supabase.from("user_collections").delete().eq("user_id", userId),

      // Delete user's capture likes
      supabase.from("capture_likes").delete().eq("user_id", userId),

      // Delete user's capture comments
      supabase.from("capture_comments").delete().eq("user_id", userId),

      // Delete user's listings
      supabase.from("listings").delete().eq("seller_id", userId),

      // Delete user's bids
      supabase.from("bids").delete().eq("bidder_id", userId),

      // Delete user's trade offers
      supabase.from("trade_offers").delete().eq("offerer_id", userId),

      // Delete user's trade offer items (if they exist)
      supabase
        .from("trade_offer_items")
        .delete()
        .eq(
          "trade_offer_id",
          supabase.from("trade_offers").select("id").eq("offerer_id", userId)
        ),

      // Delete user's transactions (both as buyer and seller)
      supabase
        .from("transactions")
        .delete()
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`),

      // Delete user's listing items (if they exist)
      supabase
        .from("listing_items")
        .delete()
        .eq(
          "listing_id",
          supabase.from("listings").select("id").eq("seller_id", userId)
        ),
    ]);

    // Then delete the user record itself
    const { error } = await supabase.from("users").delete().eq("id", userId);
    if (error) {
      console.error("Error deleting user row:", error);
    }

    // Return success
    return { success: true };
  } catch (error) {
    console.error("Error deleting user data:", error);
    throw error;
  }
}
