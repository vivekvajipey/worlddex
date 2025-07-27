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
  
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/60">
        <View className="bg-background rounded-2xl p-6 w-80 items-center">
          {/* Level up notification if applicable */}
          {levelUp && newLevel && (
            <View className="mb-4 items-center">
              <Text className="text-primary font-lexend-bold text-2xl">
                Level Up!
              </Text>
              <Text className="text-text-secondary font-lexend-medium text-lg">
                You reached Level {newLevel}
              </Text>
            </View>
          )}

          {/* Coins section */}
          {total > 0 && (
            <>
              <View className="flex-row items-center mb-2">
                <Image source={retroCoin} style={{ width: 36, height: 36, marginRight: 8 }} />
                <Text className="text-primary font-lexend-bold text-2xl">
                  +{total} Coins!
                </Text>
              </View>
              <View className="w-full mb-3">
                {rewards.map((r, i) => (
                  <View key={`coin-${i}`} className="flex-row items-start mb-1">
                    <Image source={retroCoin} style={{ width: 16, height: 16, marginRight: 6, marginTop: 2 }} />
                    <Text className="text-primary font-lexend-medium text-sm">
                      +{r.amount}
                    </Text>
                    <Text className="text-text-secondary text-sm ml-2 flex-1" numberOfLines={2}>
                      {r.reason}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* XP section */}
          {xpTotal > 0 && (
            <>
              <View className="flex-row items-center mb-2">
                <Ionicons name="star" size={32} color={Colors.primary.DEFAULT} style={{ marginRight: 8 }} />
                <Text className="text-primary font-lexend-bold text-2xl">
                  +{xpTotal} XP!
                </Text>
              </View>
              {/* Only show breakdown if there are multiple XP rewards */}
              {xpRewards.length > 1 && (
                <View className="w-full mb-3">
                  {xpRewards.map((r, i) => (
                    <View key={`xp-${i}`} className="flex-row items-start mb-1">
                      <Ionicons name="star-outline" size={14} color={Colors.text.secondary} style={{ marginRight: 6, marginTop: 3 }} />
                      <Text className="text-text-secondary text-xs flex-1" numberOfLines={2}>
                        {r.reason} (+{r.amount})
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              {/* For single reward, show the reason as subtitle */}
              {xpRewards.length === 1 && (
                <Text className="text-text-secondary text-sm mb-3">
                  {xpRewards[0].reason}
                </Text>
              )}
            </>
          )}

          <TouchableOpacity
            className="bg-primary rounded-full px-6 py-2 mt-2"
            onPress={onClose}
          >
            <Text className="text-surface font-lexend-bold text-lg">
              {levelUp ? "Awesome!" : "OK"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
} 