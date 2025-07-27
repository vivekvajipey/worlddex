import { RarityTier } from "../../shared/types/vlm";

// XP values for each rarity tier
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
  FIRST_CAPTURE_MULTIPLIER: 2,
  COLLECTION_ADD: 5,
  COLLECTION_COMPLETE: 100,
  SOCIAL_ENGAGEMENT_PER_LIKE: 1,
  SOCIAL_ENGAGEMENT_DAILY_CAP: 50,
} as const;

export class XpService {
  /**
   * Calculate XP for a capture based on its rarity
   */
  static calculateCaptureXP(rarityTier: RarityTier, isFirstCapture: boolean = false): number {
    const baseXP = XP_VALUES[rarityTier] || XP_VALUES.common;
    
    // Apply 2x multiplier for first capture of an item
    if (isFirstCapture) {
      return baseXP * XP_BONUSES.FIRST_CAPTURE_MULTIPLIER;
    }
    
    return baseXP;
  }

  /**
   * Calculate user level from total XP
   * Level progression: Level N needs sum of (1*50 + 2*50 + ... + N*50) XP
   */
  static calculateLevelFromXP(totalXP: number): number {
    let level = 1;
    let xpNeeded = 0;
    
    while (totalXP >= xpNeeded) {
      level++;
      xpNeeded += level * 50;
    }
    
    return level - 1;
  }

  /**
   * Get XP required for a specific level
   */
  static getXPRequiredForLevel(level: number): number {
    if (level <= 1) return 0;
    
    let xpTotal = 0;
    for (let i = 1; i <= level; i++) {
      xpTotal += i * 50;
    }
    
    return xpTotal;
  }

  /**
   * Get XP required for the next level
   */
  static getXPForNextLevel(currentLevel: number): number {
    return this.getXPRequiredForLevel(currentLevel + 1);
  }

  /**
   * Calculate progress percentage within current level
   */
  static calculateLevelProgress(totalXP: number, currentLevel: number): number {
    if (currentLevel === 1) {
      return (totalXP / 50) * 100;
    }
    
    const xpForCurrentLevel = this.getXPRequiredForLevel(currentLevel);
    const xpForNextLevel = this.getXPRequiredForLevel(currentLevel + 1);
    const xpIntoCurrentLevel = totalXP - xpForCurrentLevel;
    const xpNeededForLevel = xpForNextLevel - xpForCurrentLevel;
    
    return (xpIntoCurrentLevel / xpNeededForLevel) * 100;
  }

  /**
   * Get milestone rewards for reaching a level
   */
  static getLevelRewards(level: number): Array<{
    type: 'badge' | 'filter' | 'capture_limit' | 'title';
    value: string;
    description: string;
  }> {
    const rewards: Array<{
      type: 'badge' | 'filter' | 'capture_limit' | 'title';
      value: string;
      description: string;
    }> = [];

    // Camera filters every 5 levels
    if (level % 5 === 0 && level <= 20) {
      const filters = ['vintage', 'noir', 'vibrant', 'dreamy'];
      const filterIndex = (level / 5) - 1;
      if (filterIndex < filters.length) {
        rewards.push({
          type: 'filter',
          value: filters[filterIndex],
          description: `Unlock the ${filters[filterIndex]} camera filter`
        });
      }
    }

    // Capture limit increases
    if (level === 10) {
      rewards.push({
        type: 'capture_limit',
        value: '+5',
        description: 'Increase daily capture limit by 5'
      });
    } else if (level === 20) {
      rewards.push({
        type: 'capture_limit',
        value: '+5',
        description: 'Increase daily capture limit by 5'
      });
    } else if (level === 30) {
      rewards.push({
        type: 'capture_limit',
        value: '+10',
        description: 'Increase daily capture limit by 10'
      });
    }

    // Badges and titles
    if (level === 25) {
      rewards.push({
        type: 'badge',
        value: 'Explorer',
        description: 'Earn the Explorer badge'
      });
    } else if (level === 50) {
      rewards.push({
        type: 'badge',
        value: 'Collector',
        description: 'Earn the Collector badge'
      });
      rewards.push({
        type: 'title',
        value: 'Master Explorer',
        description: 'Unlock the Master Explorer title'
      });
    } else if (level === 100) {
      rewards.push({
        type: 'badge',
        value: 'Legend',
        description: 'Earn the Legend badge'
      });
      rewards.push({
        type: 'title',
        value: 'WorldDex Legend',
        description: 'Unlock the WorldDex Legend title'
      });
    }

    return rewards;
  }

  /**
   * Format XP display (e.g., "1.2K" for 1200)
   */
  static formatXP(xp: number): string {
    if (xp < 1000) return xp.toString();
    if (xp < 10000) return (xp / 1000).toFixed(1) + 'K';
    return Math.floor(xp / 1000) + 'K';
  }
}