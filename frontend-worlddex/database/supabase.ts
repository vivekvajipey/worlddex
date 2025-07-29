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
    // Soft delete the user by setting deleted_at timestamp
    const { error } = await supabase.rpc('soft_delete_user', { user_id: userId });
    
    if (error) {
      console.error("Error soft deleting user:", error);
      throw error;
    }

    // Return success
    return { success: true };
  } catch (error) {
    console.error("Error deleting user data:", error);
    throw error;
  }
}

export async function restoreDeletedAccount(userId: string) {
  if (!userId) throw new Error("User ID is required");

  try {
    const { error } = await supabase.rpc('restore_deleted_user', { user_id: userId });
    
    if (error) {
      console.error("Error restoring user:", error);
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error("Error restoring user account:", error);
    throw error;
  }
}
