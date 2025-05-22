import { Animated } from "react-native";

export type RarityTier = "common" | "uncommon" | "rare" | "epic" | "mythic" | "legendary";

export interface RarityStyle {
  borderColor: string;
  borderWidth: number;
  textColor: string;
  hasShimmer: boolean;
  hasGlow: boolean;
  backgroundColor: string;
  hasRainbow?: boolean;
}

// Color definitions for different rarity tiers
export const rarityStyles: Record<RarityTier, RarityStyle> = {
  common: {
    borderColor: '#d4d4d4',  // Light gray
    borderWidth: 2,
    textColor: '#333333',
    hasShimmer: false,
    hasGlow: false,
    backgroundColor: '#f8f8f8',
  },
  uncommon: {
    borderColor: '#7be0c3',  // Mint green
    borderWidth: 3,
    textColor: '#333333',
    hasShimmer: false,
    hasGlow: false,
    backgroundColor: '#f8f8f8',
  },
  rare: {
    borderColor: '#7bcde0',  // Light blue
    borderWidth: 3,
    textColor: '#333333',
    hasShimmer: true,
    hasGlow: false,
    backgroundColor: '#f8f8f8',
  },
  epic: {
    borderColor: '#e08b7b',  // Coral
    borderWidth: 4,
    textColor: '#333333',
    hasShimmer: true,
    hasGlow: true,
    backgroundColor: '#f8f8f8',
  },
  mythic: {
    borderColor: '#c37be0',  // Purple
    borderWidth: 4,
    textColor: '#333333',
    hasShimmer: true,
    hasGlow: true,
    backgroundColor: '#f8f8f8',
  },
  legendary: {
    // Gradient will be handled separately
    borderWidth: 5,
    borderColor: '#ffd700', // Gold fallback
    textColor: '#333333',
    hasShimmer: true,
    hasGlow: true,
    hasRainbow: true,
    backgroundColor: '#f8f8f8',
  }
};

// Gradient colors for legendary items
export const legendaryGradientColors = [
  '#ff7b00', // Orange
  '#f2ff00', // Yellow
  '#00ff1d', // Green
  '#00e4ff', // Cyan
  '#0057ff', // Blue
  '#8c00ff', // Purple
  '#ff00c8', // Pink
  '#ff0000', // Red
];

// Get glow color based on rarity tier
export function getGlowColor(rarityTier: RarityTier, intensity = 0.6): string {
  switch (rarityTier.toLowerCase() as RarityTier) {
    case 'legendary':
      return `rgba(255, 215, 0, ${intensity})`;  // Gold
    case 'mythic':
      return `rgba(195, 123, 224, ${intensity})`;  // Purple
    case 'epic':
      return `rgba(224, 139, 123, ${intensity})`;  // Coral
    case 'rare':
      return `rgba(123, 205, 224, ${intensity})`;  // Blue
    default:
      return 'transparent';
  }
} 