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
    // First delete from tables that reference the user
    await Promise.all([
      // Delete user's captures
      supabase.from("captures").delete().eq("user_id", userId),

      // Delete user's collection items
      supabase.from("user_collection_items").delete().eq("user_id", userId),

      // Delete any collections created by the user
      supabase.from("collections").delete().eq("created_by", userId),
    ]);

    // Then delete the user record itself
    await supabase.from("users").delete().eq("id", userId);

    // Return success
    return { success: true };
  } catch (error) {
    console.error("Error deleting user data:", error);
    throw error;
  }
}
