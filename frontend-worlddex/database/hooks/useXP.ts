import { supabase } from "../supabase";
import { XPTransaction, LevelReward } from "../types";

// XP values for each rarity tier (matching backend)
export const XP_VALUES = {
  common: 5,
  uncommon: 10,
  rare: 25,
  epic: 50,
  mythic: 100,
  legendary: 200,
} as const;

// Bonus XP amounts
export const XP_BONUSES = {
  DAILY_FIRST_CAPTURE: 10,
  GLOBAL_FIRST_CAPTURE_MULTIPLIER: 2, // 2x multiplier for world's first!
  COLLECTION_ADD: 5,
  COLLECTION_COMPLETE: 100,
  SOCIAL_ENGAGEMENT_PER_LIKE: 1,
  SOCIAL_ENGAGEMENT_DAILY_CAP: 50,
} as const;

interface XPReward {
  amount: number;
  reason: string;
  levelUp?: boolean;
  newLevel?: number;
}

// Function to check if this is the first capture of the day for XP
async function isFirstCaptureOfDayForXP(userId: string): Promise<XPReward> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if user has made any captures today (more reliable than checking XP transactions)
  const { data, error } = await supabase
    .from("captures")
    .select("id")
    .eq("user_id", userId)
    .gte("captured_at", today.toISOString())
    .order("captured_at", { ascending: true })
    .limit(2); // Get first 2 to check if this is the first

  if (error) {
    console.error("Error checking daily captures for XP bonus:", error);
    return { amount: 0, reason: "" };
  }

  // If there's only 1 capture today, it's the first one (the current one being processed)
  // If there are 2 or more, this is not the first
  return {
    amount: data && data.length === 1 ? XP_BONUSES.DAILY_FIRST_CAPTURE : 0,
    reason: data && data.length === 1 ? "Daily first capture bonus" : "",
  };
}


// Function to award XP using the database function
async function awardXP(
  userId: string,
  amount: number,
  reason: string,
  captureId?: string,
  collectionId?: string
): Promise<{ newXP: number; newLevel: number; levelUp: boolean } | null> {
  try {
    const { data, error } = await supabase.rpc("award_xp", {
      p_user_id: userId,
      p_amount: amount,
      p_reason: reason,
      p_capture_id: captureId || null,
      p_collection_id: collectionId || null,
    });

    if (error) {
      console.error("Error awarding XP:", error);
      return null;
    }

    // console.log("award_xp RPC response:", data);
    
    // The RPC function returns an array with one object
    if (data && data.length > 0) {
      const result = data[0];
      return {
        newXP: result.new_xp,
        newLevel: result.new_level,
        levelUp: result.level_up
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error in awardXP:", error);
    return null;
  }
}

// Main function to calculate and award XP for captures
export async function calculateAndAwardCaptureXP(
  userId: string,
  captureId: string,
  itemName: string,
  rarityTier: string,
  baseXP?: number,
  isGlobalFirst?: boolean
): Promise<{ total: number; rewards: XPReward[]; levelUp?: boolean; newLevel?: number }> {
  if (!userId || !captureId || !rarityTier) {
    return { total: 0, rewards: [] };
  }

  try {
    let totalXP = 0;
    const rewards: XPReward[] = [];

    // Calculate base XP from rarity (or use provided baseXP from backend)
    const rarityXP = baseXP || XP_VALUES[rarityTier as keyof typeof XP_VALUES] || XP_VALUES.common;
    
    // Apply multipliers
    let captureXP = rarityXP;
    let captureReason = `Capture reward (${rarityTier})`;
    
    if (isGlobalFirst) {
      // Global first gets 2x multiplier!
      captureXP = rarityXP * XP_BONUSES.GLOBAL_FIRST_CAPTURE_MULTIPLIER;
      captureReason = `You were the first to capture ${itemName}!`;
    }
    
    // Award capture XP
    const captureResult = await awardXP(userId, captureXP, captureReason, captureId);
    if (captureResult) {
      totalXP += captureXP;
      rewards.push({
        amount: captureXP,
        reason: captureReason,
        levelUp: captureResult.levelUp,
        newLevel: captureResult.newLevel,
      });
    }

    // Check for daily first capture bonus
    const dailyBonus = await isFirstCaptureOfDayForXP(userId);
    if (dailyBonus.amount > 0) {
      const dailyResult = await awardXP(userId, dailyBonus.amount, dailyBonus.reason, captureId);
      if (dailyResult) {
        totalXP += dailyBonus.amount;
        rewards.push({
          amount: dailyBonus.amount,
          reason: dailyBonus.reason,
          levelUp: dailyResult.levelUp,
          newLevel: dailyResult.newLevel,
        });
      }
    }

    // Determine if there was a level up by checking all rewards
    let levelUp = false;
    let newLevel: number | undefined = undefined;
    
    for (const reward of rewards) {
      if (reward.levelUp) {
        levelUp = true;
        newLevel = reward.newLevel;
        break; // Take the first level up we find
      }
    }

    // console.log("XP Award Summary:", {
    //   totalXP,
    //   rewards,
    //   levelUp,
    //   newLevel
    // });

    return { total: totalXP, rewards, levelUp, newLevel };
  } catch (error) {
    console.error("Error calculating capture XP:", error);
    return { total: 0, rewards: [] };
  }
}

// Function to award XP for adding to collection
export async function awardCollectionAddXP(
  userId: string,
  collectionId: string
): Promise<XPReward | null> {
  try {
    const result = await awardXP(
      userId,
      XP_BONUSES.COLLECTION_ADD,
      "Added item to collection",
      undefined,
      collectionId
    );

    if (result) {
      return {
        amount: XP_BONUSES.COLLECTION_ADD,
        reason: "Added item to collection",
        levelUp: result.levelUp,
        newLevel: result.newLevel,
      };
    }

    return null;
  } catch (error) {
    console.error("Error awarding collection add XP:", error);
    return null;
  }
}

// Function to award XP for completing a collection
export async function awardCollectionCompleteXP(
  userId: string,
  collectionId: string
): Promise<XPReward | null> {
  try {
    const result = await awardXP(
      userId,
      XP_BONUSES.COLLECTION_COMPLETE,
      "Completed collection",
      undefined,
      collectionId
    );

    if (result) {
      return {
        amount: XP_BONUSES.COLLECTION_COMPLETE,
        reason: "Completed collection",
        levelUp: result.levelUp,
        newLevel: result.newLevel,
      };
    }

    return null;
  } catch (error) {
    console.error("Error awarding collection complete XP:", error);
    return null;
  }
}

// Function to get user's XP transactions
export async function fetchUserXPTransactions(
  userId: string,
  limit: number = 10
): Promise<XPTransaction[]> {
  try {
    const { data, error } = await supabase
      .from("xp_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching XP transactions:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in fetchUserXPTransactions:", error);
    return [];
  }
}

// Function to get level rewards
export async function fetchLevelRewards(level: number): Promise<LevelReward[]> {
  try {
    const { data, error } = await supabase
      .from("level_rewards")
      .select("*")
      .eq("level", level);

    if (error) {
      console.error("Error fetching level rewards:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error in fetchLevelRewards:", error);
    return [];
  }
}

// Helper functions for XP/Level calculations (matching backend logic)
export function calculateLevelFromXP(totalXP: number): number {
  let level = 1;
  let xpNeeded = 0;
  
  while (totalXP >= xpNeeded) {
    level++;
    xpNeeded += level * 50;
  }
  
  return level - 1;
}

export function getXPRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  
  let xpTotal = 0;
  // Calculate XP needed to REACH this level (not including XP needed for this level)
  for (let i = 1; i < level; i++) {
    xpTotal += i * 50;
  }
  
  return xpTotal;
}

export function calculateLevelProgress(totalXP: number, currentLevel: number): number {
  if (currentLevel === 1) {
    return Math.min((totalXP / 50) * 100, 100);
  }
  
  const xpForCurrentLevel = getXPRequiredForLevel(currentLevel);
  const xpForNextLevel = getXPRequiredForLevel(currentLevel + 1);
  const xpIntoCurrentLevel = totalXP - xpForCurrentLevel;
  const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;
  
  return Math.min((xpIntoCurrentLevel / xpNeededForLevel) * 100, 100);
}

export function formatXP(xp: number): string {
  if (xp < 1000) return xp.toString();
  if (xp < 10000) return (xp / 1000).toFixed(1) + 'K';
  return Math.floor(xp / 1000) + 'K';
}