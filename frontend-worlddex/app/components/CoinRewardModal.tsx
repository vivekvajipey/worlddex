import React, { useEffect } from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import retroCoin from "../../assets/images/retro_coin.png";
import { usePostHog } from "posthog-react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../src/utils/colors";

interface CoinRewardModalProps {
  visible: boolean;
  onClose: () => void;
  total: number;
  rewards: { amount: number; reason: string }[];
  xpTotal?: number;
  xpRewards?: { amount: number; reason: string }[];
  levelUp?: boolean;
  newLevel?: number;
}

export default function CoinRewardModal({ 
  visible, 
  onClose, 
  total, 
  rewards = [],
  xpTotal = 0,
  xpRewards = [],
  levelUp = false,
  newLevel
}: CoinRewardModalProps) {
  const posthog = usePostHog();
  
  useEffect(() => {
    // Track screen view when modal becomes visible
    if (visible && (total !== undefined || xpTotal !== undefined) && posthog) {
      posthog.screen("Reward-Modal", {
        totalCoins: total,
        totalXP: xpTotal,
        levelUp: levelUp,
        newLevel: newLevel
      });
    }
  }, [visible, total, xpTotal, levelUp, newLevel, posthog]);
  
  // Track reward events when shown
  useEffect(() => {
    if (visible && posthog) {
      if (total > 0) {
        posthog.capture("coins_awarded", {
          amount: total,
          rewardTypes: rewards.map(r => r.reason)
        });
      }
      if (xpTotal > 0) {
        posthog.capture("xp_awarded", {
          amount: xpTotal,
          rewardTypes: xpRewards.map(r => r.reason),
          levelUp: levelUp,
          newLevel: newLevel
        });
      }
    }
  }, [visible, total, xpTotal, rewards, xpRewards, levelUp, newLevel, posthog]);
  
  // Check if we have both rewards or just one
  const hasBothRewards = total > 0 && xpTotal > 0;
  const hasSingleReward = (total > 0 && xpTotal === 0) || (total === 0 && xpTotal > 0);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/60">
        <View className="bg-surface rounded-3xl p-6 w-80 items-center shadow-lg">
          {/* Header */}
          <Text className="text-text-primary font-lexend-bold text-2xl mb-6">
            REWARDS EARNED!
          </Text>

          {/* Main reward cards */}
          <View className={`flex-row justify-center mb-4 ${hasBothRewards ? 'gap-4' : ''}`}>
            {/* Coins card */}
            {total > 0 && (
              <View className={`items-center ${hasBothRewards ? 'bg-primary/10 border-2 border-primary/20' : ''} rounded-2xl p-5 ${hasBothRewards ? 'flex-1' : ''}`}>
                <Image source={retroCoin} style={{ width: 56, height: 56, marginBottom: 12 }} />
                <Text className="text-primary font-lexend-bold text-4xl">
                  +{total} {hasSingleReward ? 'Coins' : ''}
                </Text>
                {hasBothRewards && (
                  <Text className="text-primary font-lexend-semibold text-base uppercase tracking-wide mt-1">
                    Coins
                  </Text>
                )}
              </View>
            )}

            {/* XP card */}
            {xpTotal > 0 && (
              <View className={`items-center ${hasBothRewards ? 'bg-accent/10 border-2 border-accent/20' : ''} rounded-2xl p-5 ${hasBothRewards ? 'flex-1' : ''}`}>
                <Ionicons name="star" size={56} color={Colors.accent.DEFAULT} style={{ marginBottom: 12 }} />
                <Text className="text-accent font-lexend-bold text-4xl">
                  +{xpTotal} {hasSingleReward ? 'XP' : ''}
                </Text>
                {hasBothRewards && (
                  <Text className="text-accent font-lexend-semibold text-base uppercase tracking-wide mt-1">
                    XP
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Detailed breakdown - only show if multiple reasons exist */}
          {((rewards.length > 1 || xpRewards.length > 1) || (rewards.length > 0 && xpRewards.length > 0)) && (
            <View className="w-full border border-text-secondary/10 rounded-xl p-4 mb-4">
              {/* Coins reasons */}
              {rewards.map((r, i) => (
                <Text key={`coin-${i}`} className="text-text-secondary font-lexend-regular text-sm mb-1.5">
                  {r.reason}
                </Text>
              ))}
              
              {/* Separator if both exist */}
              {rewards.length > 0 && xpRewards.length > 0 && (
                <View className="h-px bg-text-secondary/20 my-2" />
              )}
              
              {/* XP reasons */}
              {xpRewards.map((r, i) => (
                <Text key={`xp-${i}`} className="text-text-secondary font-lexend-regular text-sm mb-1.5 last:mb-0">
                  {r.reason}
                </Text>
              ))}
            </View>
          )}

          {/* Single reason display - cleaner for single rewards */}
          {hasSingleReward && rewards.length === 1 && (
            <Text className="text-text-secondary font-lexend-regular text-base mb-6">
              {rewards[0].reason}
            </Text>
          )}
          {hasSingleReward && xpRewards.length === 1 && (
            <Text className="text-text-secondary font-lexend-regular text-base mb-6">
              {xpRewards[0].reason}
            </Text>
          )}

          {/* Level up notification if applicable */}
          {levelUp && newLevel && (
            <View className="mb-4 items-center bg-accent/20 rounded-xl px-6 py-3">
              <Text className="text-accent font-lexend-bold text-xl">
                Level {newLevel} Reached!
              </Text>
            </View>
          )}

          {/* OK Button */}
          <TouchableOpacity
            className="bg-primary rounded-full px-12 py-3 shadow-md"
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text className="text-surface font-lexend-bold text-xl">
              OK
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
} 