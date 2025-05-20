import React, { useEffect } from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import retroCoin from "../../assets/images/retro_coin.png";
import { usePostHog } from "posthog-react-native";

interface CoinRewardModalProps {
  visible: boolean;
  onClose: () => void;
  total: number;
  rewards: { amount: number; reason: string }[];
}

export default function CoinRewardModal({ visible, onClose, total, rewards = [] }: CoinRewardModalProps) {
  const posthog = usePostHog();
  
  useEffect(() => {
    // Track screen view when modal becomes visible
    if (visible && total !== undefined && posthog) {
      posthog.screen("Coin-Reward-Modal", {
        totalAmount: total
      });
    }
  }, [visible, total, posthog]);
  
  // Track coin reward event when shown
  useEffect(() => {
    if (visible && total > 0 && posthog) {
      posthog.capture("coins_awarded", {
        amount: total,
        rewardTypes: rewards.map(r => r.reason)
      });
    }
  }, [visible, total, rewards, posthog]);
  
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/60">
        <View className="bg-background rounded-2xl p-6 w-80 items-center">
          <Image source={retroCoin} style={{ width: 48, height: 48 }} />
          <Text className="text-primary font-lexend-bold text-2xl mt-2 mb-1">
            +{total} Coins!
          </Text>
          <View className="w-full mb-4">
            {rewards.map((r, i) => (
              <View key={i} className="flex-row items-start mb-1">
                <Image source={retroCoin} style={{ width: 18, height: 18, marginRight: 6, marginTop: 2 }} />
                <Text className="text-primary font-lexend-medium text-base">
                  +{r.amount}
                </Text>
                <Text className="text-text-secondary ml-2 flex-1" numberOfLines={2}>
                  {r.reason}
                </Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            className="bg-primary rounded-full px-6 py-2 mt-2"
            onPress={onClose}
          >
            <Text className="text-surface font-lexend-bold text-lg">OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
} 