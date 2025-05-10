import { supabase } from "../supabase";
import { fetchCaptureCount } from "./useCaptureCount";

// Coin reward amounts
export const COIN_REWARDS = {
  FIRST_CAPTURE_OF_DAY: 2,
  STREAK_BONUSES: {
    7: 5,
    30: 20,
    100: 75,
    365: 300,
  },
  CAPTURE_MILESTONES: {
    50: 10,
    200: 30,
    500: 100,
    1000: 250,
  },
};

interface CoinReward {
  amount: number;
  reason: string;
}

// Function to check if this is the first capture of the day
async function isFirstCaptureOfDay(userId: string): Promise<CoinReward> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("captures")
    .select("captured_at")
    .eq("user_id", userId)
    .gte("captured_at", today.toISOString())
    .order("captured_at", { ascending: true });

  if (error) {
    console.error("Error checking first capture:", error);
    return { amount: 0, reason: "" };
  }

  // If there is only one capture for today, it must be the current one
  return {
    amount: data.length === 1 ? COIN_REWARDS.FIRST_CAPTURE_OF_DAY : 0,
    reason: data.length === 1 ? "First capture of the day" : "",
  };
}

// Function to check streak bonuses
async function checkStreakBonus(userId: string): Promise<CoinReward> {
  try {
    // First check if any captures were made today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayCaptures, error: todayError } = await supabase
      .from("captures")
      .select("captured_at")
      .eq("user_id", userId)
      .gte("captured_at", today.toISOString())
      .order("captured_at", { ascending: false });

    if (todayError) {
      console.error("Error checking today's captures:", todayError);
      return { amount: 0, reason: "" };
    }

    // If there are multiple captures today, only award streak bonus for the first one
    if (todayCaptures.length > 1) {
      return { amount: 0, reason: "" };
    }

    // Get user's streak
    const { data: user, error } = await supabase
      .from("users")
      .select("capture_streak")
      .eq("id", userId)
      .single();

    if (error || !user) {
      console.error("Error checking streak:", error);
      return { amount: 0, reason: "" };
    }

    const streak = user.capture_streak;
    let bonus = 0;
    let reason = "";

    // Check each streak milestone
    for (const [days, reward] of Object.entries(COIN_REWARDS.STREAK_BONUSES)) {
      if (streak === parseInt(days)) {
        bonus = reward;
        reason = `${days}-day capture streak!`;
        break;
      }
    }

    return { amount: bonus, reason };
  } catch (error) {
    console.error("Error in checkStreakBonus:", error);
    return { amount: 0, reason: "" };
  }
}

// Function to check capture milestones
async function checkCaptureMilestone(userId: string): Promise<CoinReward> {
  try {
    const totalCaptures = await fetchCaptureCount(userId);
    let milestoneReward = 0;
    let reason = "";

    // Check each milestone
    for (const [captures, reward] of Object.entries(
      COIN_REWARDS.CAPTURE_MILESTONES
    )) {
      if (totalCaptures === parseInt(captures)) {
        milestoneReward = reward;
        reason = `Reached ${captures} total captures!`;
        break;
      }
    }

    return { amount: milestoneReward, reason };
  } catch (error) {
    console.error("Error checking capture count:", error);
    return { amount: 0, reason: "" };
  }
}

// Main function to calculate and award coins
export async function calculateAndAwardCoins(
  userId: string
): Promise<{ total: number; rewards: { amount: number; reason: string }[] }> {
  if (!userId) return { total: 0, rewards: [] };

  try {
    let totalCoins = 0;
    const rewards: { amount: number; reason: string }[] = [];

    // Check first capture of day
    const firstCaptureReward = await isFirstCaptureOfDay(userId);
    if (firstCaptureReward.amount > 0) {
      totalCoins += firstCaptureReward.amount;
      rewards.push(firstCaptureReward);
    }

    // Check streak bonus
    const streakReward = await checkStreakBonus(userId);
    if (streakReward.amount > 0) {
      totalCoins += streakReward.amount;
      rewards.push(streakReward);
    }

    // Check capture milestone
    const milestoneReward = await checkCaptureMilestone(userId);
    if (milestoneReward.amount > 0) {
      totalCoins += milestoneReward.amount;
      rewards.push(milestoneReward);
    }

    // If we have coins to award, update the user's balance
    if (totalCoins > 0) {
      const { error } = await supabase.rpc("increment_user_balance", {
        user_id: userId,
        amount: totalCoins,
      });

      if (error) {
        console.error("Error updating balance:", error);
        return { total: 0, rewards: [] };
      }
    }

    return { total: totalCoins, rewards };
  } catch (error) {
    console.error("Error calculating coins:", error);
    return { total: 0, rewards: [] };
  }
}
